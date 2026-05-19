/**
 * A1: Обёртка-адаптер для google.script.run
 * Обеспечивает retry, очередь запросов, единую обработку ошибок
 * ПОЛНОСТЬЮ СОВМЕСТИМ с оригинальным API
 */

class GoogleAppsScriptAdapter {
  constructor(config = {}) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      timeout: config.timeout || 30000,
      queueEnabled: config.queueEnabled !== false,
      maxConcurrent: config.maxConcurrent || 5,
      debug: config.debug || false,
    };
    
    this.queue = [];           // Очередь запросов
    this.active = 0;          // Активные запросы
    this.pendingRetries = new Map(); // Retry таймеры
    this.handlers = {         // Глобальные обработчики
      onError: null,
      onNetworkError: null,
    };
    
    // Оригинальный google.script.run
    this.originalRun = typeof google !== 'undefined' && google.script && google.script.run 
      ? google.script.run 
      : null;
    
    if (!this.originalRun && typeof console !== 'undefined') {
      console.warn('[Adapter] google.script.run не найден, работа в демо-режиме');
    }
  }
  
  /**
   * Основной метод вызова
   * @param {string} functionName - Имя функции на сервере
   * @param {Object} options - Опции вызова
   * @returns {Promise} - Promise с результатом
   */
  call(functionName, options = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        id: Date.now() + '_' + Math.random(),
        functionName,
        params: options.params || [],
        resolve,
        reject,
        retries: 0,
        withSuccessHandler: options.withSuccessHandler || null,
        withFailureHandler: options.withFailureHandler || null,
        timeout: options.timeout || this.config.timeout,
      };
      
      if (this.config.queueEnabled && this.active >= this.config.maxConcurrent) {
        // Ставим в очередь
        this.queue.push(request);
        this._log('debug', `[Adapter] Запрос ${request.id} в очереди (${this.queue.length})`);
      } else {
        this._execute(request);
      }
    });
  }
  
  /**
   * Выполнение запроса
   * @private
   */
  _execute(request) {
    if (!this.originalRun) {
      // Демо-режим: эмулируем успех
      request.resolve({ mock: true, function: request.functionName });
      return;
    }
    
    this.active++;
    this._log('debug', `[Adapter] Выполняется ${request.functionName} (${request.id}), активных: ${this.active}`);
    
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Таймаут ${request.timeout}ms для ${request.functionName}`));
      }, request.timeout);
    });
    
    // Создаём обёртку для google.script.run
    const executor = (resolve, reject) => {
      let run = this.originalRun;
      
      // Если указаны кастомные обработчики
      if (request.withSuccessHandler) {
        run = run.withSuccessHandler(request.withSuccessHandler);
      }
      if (request.withFailureHandler) {
        run = run.withFailureHandler(request.withFailureHandler);
      }
      
      // Добавляем стандартные обработчики
      run = run.withSuccessHandler((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      }).withFailureHandler((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
      
      // Вызов функции
      run[request.functionName](...request.params);
    };
    
    // Promise race между вызовом и таймаутом
    Promise.race([
      new Promise(executor),
      timeoutPromise,
    ]).then((result) => {
      this.active--;
      request.resolve(result);
      this._processQueue();
    }).catch((error) => {
      this.active--;
      
      // Обработка ошибки с retry
      if (request.retries < this.config.maxRetries) {
        request.retries++;
        this._log('warn', `[Adapter] ${request.functionName} ошибка, retry ${request.retries}/${this.config.maxRetries}`);
        
        const retryDelay = this.config.retryDelay * Math.pow(2, request.retries - 1);
        const timerId = setTimeout(() => {
          this.pendingRetries.delete(request.id);
          this._execute(request);
        }, retryDelay);
        
        this.pendingRetries.set(request.id, timerId);
      } else {
        this._log('error', `[Adapter] ${request.functionName} окончательная ошибка:`, error);
        
        if (this.handlers.onError) {
          this.handlers.onError(error, request);
        }
        request.reject(error);
      }
      
      this._processQueue();
    });
  }
  
  /**
   * Обработка очереди
   * @private
   */
  _processQueue() {
    if (!this.config.queueEnabled) return;
    
    while (this.queue.length > 0 && this.active < this.config.maxConcurrent) {
      const nextRequest = this.queue.shift();
      this._execute(nextRequest);
    }
  }
  
  /**
   * Отмена всех запросов
   */
  cancelAll() {
    // Очистка очереди
    this.queue.forEach(req => {
      req.reject(new Error('Запрос отменён'));
    });
    this.queue = [];
    
    // Отмена pending retry
    this.pendingRetries.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this.pendingRetries.clear();
  }
  
  /**
   * Установка глобального обработчика ошибок
   */
  setGlobalErrorHandler(handler) {
    this.handlers.onError = handler;
  }
  
  /**
   * Совместимость с оригинальным синтаксисом
   * google.script.run.withSuccessHandler(...).functionName()
   */
  get run() {
    const adapter = this;
    return {
      withSuccessHandler: function(handler) {
        return {
          withFailureHandler: function(errorHandler) {
            return new Proxy({}, {
              get: (_, functionName) => {
                return (...params) => {
                  adapter.call(functionName, {
                    params,
                    withSuccessHandler: handler,
                    withFailureHandler: errorHandler,
                  }).catch((err) => {
                    if (typeof console !== 'undefined') {
                      console.error(err);
                    }
                  });
                };
              }
            });
          }
        };
      },
      
      // Прямой вызов без обработчиков
      [Symbol.for('direct')]: (functionName, ...params) => {
        return adapter.call(functionName, { params });
      }
    };
  }
  
  /**
   * Логирование
   */
  _log(level, ...args) {
    if (typeof Logger !== 'undefined' && Logger[level]) {
      Logger[level](...args);
    } else if (this.config.debug && typeof console !== 'undefined' && console[level]) {
      console[level](...args);
    }
  }
}

// Создаём глобальный экземпляр (только в браузере)
if (typeof window !== 'undefined') {
  // Получаем конфигурацию, если она существует
  let config = null;
  if (typeof CONFIG !== 'undefined' && CONFIG?.api) {
    config = CONFIG.api;
  }
  
  window.GASAdapter = new GoogleAppsScriptAdapter(config);
}

// Для Google Apps Script (экспорт)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GoogleAppsScriptAdapter };
}