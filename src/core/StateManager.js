/**
 * A3: Централизованный менеджер состояния
 * Реактивное хранилище с подписками на изменения
 */

class StateManager {
  constructor(initialState = {}) {
    this.state = this._deepClone(initialState);
    this.listeners = new Map();     // Подписчики на конкретные пути
    this.wildcardListeners = [];     // Подписчики на любые изменения
    this.history = [];               // История изменений (для отмены)
    this.historyLimit = 50;
    this.middlewares = [];
    
    // Заморозка в production
    if (!CONFIG?.dev?.debug) {
      this._deepFreeze(this.state);
    }
  }
  
  /**
   * Получение значения по пути
   * @param {string} path - Путь через точку, например 'user.name'
   * @param {any} defaultValue - Значение по умолчанию
   */
  get(path, defaultValue = undefined) {
    if (!path) return this.state;
    
    const parts = path.split('.');
    let current = this.state;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return defaultValue;
      }
      current = current[part];
    }
    
    return current !== undefined ? current : defaultValue;
  }
  
  /**
   * Установка значения по пути
   * @param {string} path - Путь через точку
   * @param {any} value - Новое значение
   * @param {boolean} recordHistory - Записать в историю?
   * @returns {boolean} - Было ли изменение
   */
  set(path, value, recordHistory = true) {
    const oldValue = this.get(path);
    
    // Проверка на реальное изменение
    if (this._isEqual(oldValue, value)) {
      return false;
    }
    
    // Запись в историю
    if (recordHistory) {
      this._addToHistory(path, oldValue, value);
    }
    
    // Прогон через middleware
    let processedValue = value;
    for (const middleware of this.middlewares) {
      const result = middleware(path, processedValue, oldValue);
      if (result !== undefined) processedValue = result;
    }
    
    // Обновление состояния
    if (path === '') {
      this.state = this._deepClone(processedValue);
    } else {
      const parts = path.split('.');
      const lastPart = parts.pop();
      let current = this.state;
      
      for (const part of parts) {
        if (current[part] === undefined) {
          current[part] = {};
        }
        current = current[part];
      }
      
      current[lastPart] = this._deepClone(processedValue);
    }
    
    // Заморозка в production
    if (!CONFIG?.dev?.debug) {
      this._deepFreeze(this.state);
    }
    
    // Уведомление подписчиков
    this._notifyListeners(path, processedValue, oldValue);
    
    this._log('debug', `[State] Изменён ${path}:`, { old: oldValue, new: processedValue });
    
    return true;
  }
  
  /**
   * Массовое обновление состояния
   * @param {Object} updates - Объект с обновлениями
   * @param {boolean} merge - Объединять или заменять?
   */
  setMultiple(updates, merge = true) {
    const changes = [];
    
    for (const [path, value] of Object.entries(updates)) {
      const oldValue = this.get(path);
      if (!this._isEqual(oldValue, value)) {
        changes.push({ path, oldValue, newValue: value });
      }
    }
    
    if (changes.length === 0) return false;
    
    // Запись в историю (как одно действие)
    this._addToHistoryBatch(changes);
    
    // Применение изменений
    for (const change of changes) {
      if (merge) {
        this.set(change.path, change.newValue, false);
      } else {
        const parts = change.path.split('.');
        const lastPart = parts.pop();
        let current = this.state;
        
        for (const part of parts) {
          if (current[part] === undefined) current[part] = {};
          current = current[part];
        }
        current[lastPart] = this._deepClone(change.newValue);
      }
    }
    
    // Уведомление (одно событие на все изменения)
    this._notifyListeners('*', this.state, null, { changes });
    
    return true;
  }
  
  /**
   * Подписка на изменения
   * @param {string} path - Путь для отслеживания (или '*' для всех)
   * @param {Function} callback - (newValue, oldValue, path) => {}
   * @returns {Function} Функция отписки
   */
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, []);
    }
    
    const listeners = this.listeners.get(path);
    listeners.push(callback);
    
    // Возврат функции отписки
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
      if (listeners.length === 0) this.listeners.delete(path);
    };
  }
  
  /**
   * Подписка на любые изменения
   */
  subscribeAll(callback) {
    this.wildcardListeners.push(callback);
    return () => {
      const idx = this.wildcardListeners.indexOf(callback);
      if (idx !== -1) this.wildcardListeners.splice(idx, 1);
    };
  }
  
  /**
   * Отмена последнего изменения
   */
  undo() {
    const lastChange = this.history.pop();
    if (!lastChange) return false;
    
    if (lastChange.type === 'single') {
      this.set(lastChange.path, lastChange.oldValue, false);
    } else if (lastChange.type === 'batch') {
      for (const change of lastChange.changes.reverse()) {
        this.set(change.path, change.oldValue, false);
      }
    }
    
    this._log('info', `[State] Отмена изменения от ${new Date(lastChange.timestamp).toLocaleTimeString()}`);
    return true;
  }
  
  /**
   * Сброс состояния
   */
  reset(initialState = {}) {
    this.state = this._deepClone(initialState);
    this.history = [];
    this._notifyListeners('*', this.state, null);
    this._log('info', '[State] Состояние сброшено');
  }
  
  /**
   * Добавление middleware
   */
  use(middleware) {
    this.middlewares.push(middleware);
  }
  
  /**
   * Уведомление подписчиков
   * @private
   */
  _notifyListeners(path, newValue, oldValue, extra = null) {
    // Конкретные подписчики
    if (this.listeners.has(path)) {
      for (const callback of this.listeners.get(path)) {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          this._log('error', `[State] Ошибка в подписчике ${path}:`, error);
        }
      }
    }
    
    // Родительские подписчики (например, 'user' для 'user.name')
    const parts = path.split('.');
    for (let i = parts.length - 1; i >= 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      if (this.listeners.has(parentPath)) {
        const parentValue = this.get(parentPath);
        for (const callback of this.listeners.get(parentPath)) {
          try {
            callback(parentValue, null, parentPath);
          } catch (error) {
            this._log('error', `[State] Ошибка в родительском подписчике ${parentPath}:`, error);
          }
        }
      }
    }
    
    // Wildcard подписчики
    for (const callback of this.wildcardListeners) {
      try {
        callback(path, newValue, oldValue, extra);
      } catch (error) {
        this._log('error', '[State] Ошибка в wildcard подписчике:', error);
      }
    }
  }
  
  /**
   * Добавление в историю
   * @private
   */
  _addToHistory(path, oldValue, newValue) {
    this.history.push({
      type: 'single',
      path,
      oldValue: this._deepClone(oldValue),
      newValue: this._deepClone(newValue),
      timestamp: Date.now(),
    });
    
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }
  }
  
  _addToHistoryBatch(changes) {
    this.history.push({
      type: 'batch',
      changes: changes.map(c => ({
        path: c.path,
        oldValue: this._deepClone(c.oldValue),
        newValue: this._deepClone(c.newValue),
      })),
      timestamp: Date.now(),
    });
    
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }
  }
  
  /**
   * Вспомогательные функции
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof RegExp) return new RegExp(obj);
    if (Array.isArray(obj)) return obj.map(item => this._deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this._deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  _deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.freeze(obj);
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        this._deepFreeze(obj[key]);
      }
    }
  }
  
  _isEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!this._isEqual(a[key], b[key])) return false;
    }
    return true;
  }
  
  _log(level, ...args) {
    if (typeof Logger !== 'undefined') {
      Logger[level](...args);
    } else if (CONFIG?.dev?.debug && console[level]) {
      console[level](...args);
    }
  }
}

// Глобальный экземпляр
window.StateManager = new StateManager({
  data: null,
  loading: false,
  error: null,
  ui: {
    isMobile: window.innerWidth <= (CONFIG?.ui?.mobileBreakpoint || 768),
    theme: 'light',
    notifications: [],
  },
  table: {
    scrollTop: 0,
    renderedRows: [],
    totalRows: 0,
  },
  csv: {
    isProcessing: false,
    progress: 0,
  },
});