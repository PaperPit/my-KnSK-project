/**
 * D4: Система резервного копирования
 * Автоматические бэкапы перед массовыми операциями
 */

class BackupManager {
  constructor(config = {}) {
    this.config = {
      autoBackup: config.autoBackup !== false,
      maxBackups: config.maxBackups || 10,
      backupSheet: config.backupSheet || '_Backups',
      operations: config.operations || ['delete', 'update', 'clear'],
    };
    
    this.backups = [];
    this.currentBackup = null;
    this._loadBackupsList();
  }
  
  /**
   * Создание резервной копии
   * @param {string} operation - Тип операции (delete, update, clear)
   * @param {Object} data - Данные для бэкапа
   * @returns {Promise<Object>} - Информация о бэкапе
   */
  async createBackup(operation, data = null) {
    if (!this.config.autoBackup && !data) {
      this._log('debug', 'Автоматическое бэкапирование отключено');
      return null;
    }
    
    this._log('info', `Создание бэкапа для операции: ${operation}`);
    
    const backupId = Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    const timestamp = new Date().toISOString();
    
    let backupData = data;
    if (!backupData) {
      // Получение текущих данных
      backupData = await this._fetchCurrentData();
    }
    
    const backup = {
      id: backupId,
      timestamp,
      operation,
      data: backupData,
      size: JSON.stringify(backupData).length,
    };
    
    // Сохранение в Google Sheets
    const saved = await this._saveToSheet(backup);
    if (saved) {
      this.backups.unshift(backup);
      if (this.backups.length > this.config.maxBackups) {
        const oldest = this.backups.pop();
        await this._deleteOldBackup(oldest.id);
      }
      
      this._log('info', `Бэкап ${backupId} создан, размер: ${(backup.size / 1024).toFixed(2)} KB`);
      
      // Эмит события (только в браузере)
      if (typeof window !== 'undefined' && window.EventBus) {
        window.EventBus.emit(AppEvents.BACKUP_CREATED, backup);
      }
      
      return backup;
    }
    
    return null;
  }
  
  /**
   * Восстановление из бэкапа
   * @param {string} backupId - ID бэкапа
   * @returns {Promise<boolean>}
   */
  async restoreBackup(backupId) {
    const backup = this.backups.find(b => b.id === backupId);
    if (!backup) {
      this._log('error', `Бэкап ${backupId} не найден`);
      return false;
    }
    
    this._log('warn', `Восстановление из бэкапа ${backupId} от ${backup.timestamp}`);
    
    // Создание бэкапа перед восстановлением (на всякий случай)
    await this.createBackup('before_restore');
    
    // Восстановление данных
    const restored = await this._restoreData(backup.data);
    
    if (restored) {
      this._log('info', `Успешное восстановление из бэкапа ${backupId}`);
      
      // Эмит события (только в браузере)
      if (typeof window !== 'undefined' && window.EventBus) {
        window.EventBus.emit(AppEvents.BACKUP_RESTORED, backup);
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Получение списка бэкапов
   */
  getBackups() {
    return this.backups.map(b => ({
      id: b.id,
      timestamp: b.timestamp,
      operation: b.operation,
      size: b.size,
      formattedDate: new Date(b.timestamp).toLocaleString(),
    }));
  }
  
  /**
   * Удаление бэкапа
   */
  async deleteBackup(backupId) {
    const index = this.backups.findIndex(b => b.id === backupId);
    if (index === -1) return false;
    
    await this._deleteOldBackup(backupId);
    this.backups.splice(index, 1);
    this._log('info', `Бэкап ${backupId} удалён`);
    return true;
  }
  
  /**
   * Очистка всех бэкапов
   */
  async clearAllBackups() {
    for (const backup of this.backups) {
      await this._deleteOldBackup(backup.id);
    }
    this.backups = [];
    this._log('info', 'Все бэкапы удалены');
  }
  
  /**
   * Обёртка для операций с авто-бэкапом
   * @param {Function} operation - Функция для выполнения
   * @param {string} operationName - Название операции
   */
  async withBackup(operation, operationName) {
    if (this.config.operations.includes(operationName)) {
      await this.createBackup(operationName);
    }
    
    try {
      const result = await operation();
      return result;
    } catch (error) {
      this._log('error', `Ошибка в ${operationName}:`, error);
      
      // Автоматическое восстановление при ошибке
      if (this.config.autoBackup) {
        const latestBackup = this.backups[0];
        if (latestBackup && latestBackup.operation === operationName) {
          this._log('warn', `Автоматическое восстановление после ошибки в ${operationName}`);
          await this.restoreBackup(latestBackup.id);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Внутренние методы для работы с Google Sheets
   * @private
   */
  async _fetchCurrentData() {
    // Получение текущих данных через google.script.run
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .getCurrentDataForBackup();
      } else {
        // Демо-режим
        resolve({ mock: true, timestamp: Date.now() });
      }
    });
  }
  
  async _saveToSheet(backup) {
    return new Promise((resolve) => {
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(() => resolve(true))
          .withFailureHandler(() => resolve(false))
          .saveBackupToSheet(this.config.backupSheet, backup);
      } else {
        // Демо-режим: сохраняем в localStorage (только в браузере)
        if (typeof localStorage !== 'undefined') {
          const backups = JSON.parse(localStorage.getItem('demo_backups') || '[]');
          backups.unshift(backup);
          localStorage.setItem('demo_backups', JSON.stringify(backups.slice(0, this.config.maxBackups)));
        }
        resolve(true);
      }
    });
  }
  
  async _deleteOldBackup(backupId) {
    return new Promise((resolve) => {
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(() => resolve(true))
          .withFailureHandler(() => resolve(false))
          .deleteBackupFromSheet(this.config.backupSheet, backupId);
      } else {
        // Демо-режим
        if (typeof localStorage !== 'undefined') {
          const backups = JSON.parse(localStorage.getItem('demo_backups') || '[]');
          const filtered = backups.filter(b => b.id !== backupId);
          localStorage.setItem('demo_backups', JSON.stringify(filtered));
        }
        resolve(true);
      }
    });
  }
  
  async _restoreData(backupData) {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(() => resolve(true))
          .withFailureHandler(() => resolve(false))
          .restoreFromBackup(backupData);
      } else {
        // Демо-режим
        resolve(true);
      }
    });
  }
  
  _loadBackupsList() {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('backups_list_demo');
      if (stored) {
        try {
          this.backups = JSON.parse(stored);
        } catch (e) {
          this.backups = [];
        }
      }
    }
  }
  
  _log(level, ...args) {
    // Проверяем наличие Logger в браузере
    if (typeof window !== 'undefined' && window.Logger) {
      window.Logger[level](`[BackupManager]`, ...args);
    } else if (typeof console !== 'undefined' && console[level]) {
      console[level](`[BackupManager]`, ...args);
    }
  }
}

// Глобальный экземпляр (только в браузере)
if (typeof window !== 'undefined') {
  window.BackupManager = new BackupManager(CONFIG?.backup);

  // Автоматическая обёртка для опасных операций
  if (window.BackupManager && window.BackupManager.config.autoBackup) {
    window.BackupManager.withBackup = window.BackupManager.withBackup.bind(window.BackupManager);
  }
}