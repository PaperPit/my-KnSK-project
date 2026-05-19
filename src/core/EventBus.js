/**
 * A2: Шина событий для коммуникации компонентов
 * Позволяет слабо связанным компонентам обмениваться данными
 */

class EventBus {
  constructor() {
    this.events = new Map();     // Хранилище событий и подписчиков
    this.onceEvents = new Map(); // Однократные подписки
    this.middlewares = [];       // Middleware для фильтрации/модификации
    this.maxListeners = 10;      // Максимум слушателей на событие (предупреждение)
  }
  
  /**
   * Подписка на событие
   * @param {string} event - Имя события
   * @param {Function} callback - Функция-обработчик
   * @param {Object} context - Контекст выполнения (this)
   * @returns {Function} Функция для отписки
   */
  on(event, callback, context = null) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    const listeners = this.events.get(event);
    
    // Проверка на максимальное количество слушателей
    if (listeners.length >= this.maxListeners) {
      console.warn(`[EventBus] Событие ${event} имеет ${listeners.length} слушателей, возможна утечка памяти`);
    }
    
    const listener = { callback, context };
    listeners.push(listener);
    
    // Возвращаем функцию для отписки
    return () => this.off(event, callback, context);
  }
  
  /**
   * Однократная подписка
   * @param {string} event - Имя события
   * @param {Function} callback - Функция-обработчик
   * @param {Object} context - Контекст выполнения
   * @returns {Function} Функция для отписки
   */
  once(event, callback, context = null) {
    if (!this.onceEvents.has(event)) {
      this.onceEvents.set(event, []);
    }
    
    const listeners = this.onceEvents.get(event);
    const listener = { callback, context };
    listeners.push(listener);
    
    return () => {
      const idx = listeners.findIndex(l => l.callback === callback && l.context === context);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }
  
  /**
   * Отписка от события
   * @param {string} event - Имя события
   * @param {Function} callback - Функция-обработчик
   * @param {Object} context - Контекст
   */
  off(event, callback, context = null) {
    // Удаляем из обычных подписок
    if (this.events.has(event)) {
      const listeners = this.events.get(event);
      const idx = listeners.findIndex(l => l.callback === callback && l.context === context);
      if (idx !== -1) listeners.splice(idx, 1);
      
      // Очищаем массив если пустой
      if (listeners.length === 0) {
        this.events.delete(event);
      }
    }
    
    // Удаляем из once-подписок
    if (this.onceEvents.has(event)) {
      const listeners = this.onceEvents.get(event);
      const idx = listeners.findIndex(l => l.callback === callback && l.context === context);
      if (idx !== -1) listeners.splice(idx, 1);
      
      if (listeners.length === 0) {
        this.onceEvents.delete(event);
      }
    }
  }
  
  /**
   * Эмит события (вызов всех подписчиков)
   * @param {string} event - Имя события
   * @param {any} data - Данные события
   * @returns {Promise<Array>} - Результаты всех обработчиков
   */
  async emit(event, data = null) {
    const startTime = performance.now();
    
    // Прогон через middleware
    let processedData = data;
    for (const middleware of this.middlewares) {
      const result = await middleware(event, processedData);
      if (result !== undefined) processedData = result;
    }
    
    const handlers = [];
    
    // Обычные подписчики
    if (this.events.has(event)) {
      handlers.push(...this.events.get(event));
    }
    
    // Once-подписчики (копируем и удаляем после вызова)
    let onceHandlers = [];
    if (this.onceEvents.has(event)) {
      onceHandlers = [...this.onceEvents.get(event)];
      this.onceEvents.delete(event);
    }
    
    const allHandlers = [...handlers, ...onceHandlers];
    
    if (allHandlers.length === 0) {
      this._log('debug', `[EventBus] Событие ${event} не имеет подписчиков`);
      return [];
    }
    
    this._log('debug', `[EventBus] Эмит ${event} (${allHandlers.length} подписчиков)`);
    
    // Вызов всех обработчиков
    const results = await Promise.all(allHandlers.map(async (listener) => {
      try {
        return await listener.callback.call(listener.context, processedData);
      } catch (error) {
        this._log('error', `[EventBus] Ошибка в обработчике ${event}:`, error);
        return { error: error.message };
      }
    }));
    
    const duration = performance.now() - startTime;
    if (duration > 100) {
      this._log('warn', `[EventBus] Событие ${event} обрабатывалось ${duration.toFixed(2)}ms`);
    }
    
    return results;
  }
  
  /**
   * Асинхронный эмит без ожидания результатов (fire-and-forget)
   */
  emitAsync(event, data = null) {
    this.emit(event, data).catch(err => {
      this._log('error', `[EventBus] Ошибка при асинхронном эмите ${event}:`, err);
    });
  }
  
  /**
   * Добавление middleware
   * @param {Function} middleware - (event, data) => modifiedData
   */
  use(middleware) {
    this.middlewares.push(middleware);
  }
  
  /**
   * Получение списка активных событий
   */
  getActiveEvents() {
    const events = [];
    for (const [event, listeners] of this.events) {
      events.push({ event, count: listeners.length });
    }
    return events;
  }
  
  /**
   * Очистка всех подписок
   */
  clear() {
    this.events.clear();
    this.onceEvents.clear();
    this.middlewares = [];
    this._log('info', '[EventBus] Все подписки очищены');
  }
  
  /**
   * Логирование через D2
   */
  _log(level, ...args) {
    if (typeof Logger !== 'undefined') {
      Logger[level](...args);
    } else if (CONFIG?.dev?.debug && console[level]) {
      console[level](...args);
    }
  }
}

// Глобальный экземпляр
window.EventBus = new EventBus();

// Предустановленные события приложения
window.AppEvents = {
  // Данные
  DATA_LOADING: 'data:loading',
  DATA_LOADED: 'data:loaded',
  DATA_ERROR: 'data:error',
  DATA_UPDATED: 'data:updated',
  
  // CSV
  CSV_PARSE_START: 'csv:parseStart',
  CSV_PARSE_PROGRESS: 'csv:parseProgress',
  CSV_PARSE_COMPLETE: 'csv:parseComplete',
  
  // Таблица
  TABLE_RENDER_START: 'table:renderStart',
  TABLE_RENDER_COMPLETE: 'table:renderComplete',
  TABLE_ROW_CLICK: 'table:rowClick',
  TABLE_SORT: 'table:sort',
  
  // UI
  UI_MOBILE_TOGGLE: 'ui:mobileToggle',
  UI_THEME_CHANGE: 'ui:themeChange',
  UI_NOTIFICATION: 'ui:notification',
  
  // Ошибки
  ERROR_GLOBAL: 'error:global',
  ERROR_NETWORK: 'error:network',
  
  // Бэкапы
  BACKUP_CREATED: 'backup:created',
  BACKUP_RESTORED: 'backup:restored',
};