/**
 * D2: Система логирования с уровнями
 * Поддержка localStorage, консоли, и отправки ошибок
 */

class Logger {
  constructor(config = {}) {
    this.level = config.level || 'info';
    this.maxEntries = config.maxEntries || 1000;
    this.persistToLocalStorage = config.persistToLocalStorage !== false;
    this.showInConsole = config.showInConsole !== false;
    this.remoteEndpoint = config.remoteEndpoint || null;
    this.buffer = [];           // Буфер для батчевой отправки
    this.bufferTimeout = null;
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    
    // Загрузка сохранённых логов
    if (this.persistToLocalStorage) {
      this._loadFromStorage();
    }
  }
  
  /**
   * Основной метод логирования
   */
  log(level, ...args) {
    if (this.levels[level] < this.levels[this.level]) return;
    
    const entry = {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      level,
      message: this._formatMessage(args),
      stack: level === 'error' ? this._getStackTrace() : null,
    };
    
    // Добавление в буфер
    this.buffer.unshift(entry);
    if (this.buffer.length > this.maxEntries) {
      this.buffer.pop();
    }
    
    // Сохранение в localStorage
    if (this.persistToLocalStorage) {
      this._saveToStorage();
    }
    
    // Вывод в консоль
    if (this.showInConsole && console[level]) {
      console[level](`[${entry.timestamp}]`, ...args);
    }
    
    // Отправка на сервер для error уровня
    if (level === 'error' && this.remoteEndpoint) {
      this._sendToRemote(entry);
    }
    
    // Эмит события через EventBus (A2)
    if (typeof window !== 'undefined' && window.EventBus) {
      window.EventBus.emitAsync('log:added', entry);
    }
  }
  
  debug(...args) { this.log('debug', ...args); }
  info(...args) { this.log('info', ...args); }
  warn(...args) { this.log('warn', ...args); }
  error(...args) { this.log('error', ...args); }
  
  /**
   * Получение всех логов
   */
  getLogs(level = null, limit = null) {
    let logs = this.buffer;
    if (level) {
      logs = logs.filter(log => this.levels[log.level] >= this.levels[level]);
    }
    if (limit) {
      logs = logs.slice(0, limit);
    }
    return logs;
  }
  
  /**
   * Экспорт логов в CSV
   */
  exportToCSV() {
    const headers = ['Timestamp', 'Level', 'Message', 'Stack'];
    const rows = this.buffer.map(log => [
      log.timestamp,
      log.level,
      log.message.replace(/,/g, ';'),
      log.stack ? log.stack.replace(/,/g, ';') : '',
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    return csv;
  }
  
  /**
   * Очистка логов
   */
  clear() {
    this.buffer = [];
    if (this.persistToLocalStorage) {
      localStorage.removeItem('app_logs');
    }
    this.info('Логи очищены');
  }
  
  /**
   * Поиск по логам
   */
  search(query) {
    const lowerQuery = query.toLowerCase();
    return this.buffer.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      (log.stack && log.stack.toLowerCase().includes(lowerQuery))
    );
  }
  
  /**
   * Статистика по логам
   */
  getStats() {
    const stats = {
      total: this.buffer.length,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0 },
      lastHour: 0,
      lastDay: 0,
    };
    
    const oneHourAgo = Date.now() - 3600000;
    const oneDayAgo = Date.now() - 86400000;
    
    for (const log of this.buffer) {
      stats.byLevel[log.level]++;
      
      const logTime = new Date(log.timestamp).getTime();
      if (logTime > oneHourAgo) stats.lastHour++;
      if (logTime > oneDayAgo) stats.lastDay++;
    }
    
    return stats;
  }
  
  /**
   * Вспомогательные методы
   * @private
   */
  _formatMessage(args) {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }
  
  _getStackTrace() {
    const err = new Error();
    const stack = err.stack.split('\n').slice(2, 5).join('\n');
    return stack;
  }
  
  _saveToStorage() {
    try {
      const toStore = this.buffer.slice(0, this.maxEntries);
      localStorage.setItem('app_logs', JSON.stringify(toStore));
    } catch (e) {
      console.warn('Не удалось сохранить логи в localStorage:', e);
    }
  }
  
  _loadFromStorage() {
    try {
      const stored = localStorage.getItem('app_logs');
      if (stored) {
        this.buffer = JSON.parse(stored);
        // Проверка на максимальный размер
        if (this.buffer.length > this.maxEntries) {
          this.buffer = this.buffer.slice(0, this.maxEntries);
        }
      }
    } catch (e) {
      console.warn('Не удалось загрузить логи из localStorage:', e);
    }
  }
  
  _sendToRemote(entry) {
    if (!this.remoteEndpoint) return;
    
    // Базовая отправка без fetch в Apps Script окружении
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run.withFailureHandler(() => {}).logError(entry);
    } else if (typeof fetch !== 'undefined') {
      // Отложенная отправка, не блокируем основной поток
      setTimeout(() => {
        fetch(this.remoteEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        }).catch(() => {});
      }, 0);
    }
  }
}

// Глобальный экземпляр
window.Logger = new Logger(CONFIG?.logging);

// Замена console.log для перехвата
if (CONFIG?.logging?.captureConsole) {
  const originalConsole = { ...console };
  for (const level of ['debug', 'info', 'warn', 'error']) {
    console[level] = (...args) => {
      window.Logger[level](...args);
      originalConsole[level](...args);
    };
  }
}