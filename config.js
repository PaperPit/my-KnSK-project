/**
 * Конфигурационный файл проекта
 * A4: Централизованное хранение всех настроек
 */

const CONFIG = {
  // Настройки API
  api: {
    maxRetries: 3,              // Максимум попыток при ошибке
    retryDelay: 1000,           // Задержка между попытками (ms)
    timeout: 30000,             // Таймаут запроса (ms)
    queueEnabled: true,         // Очередь запросов
    maxConcurrent: 5,           // Максимум параллельных запросов
  },
  
  // Настройки CSV
  csv: {
    maxFileSize: 100 * 1024 * 1024,  // 100 MB
    chunkSize: 1024 * 1024,           // 1 MB на чанк для worker
    defaultDelimiter: ',',
    encoding: 'UTF-8',
    useWorker: false,                 // Web Worker (файл src/workers/csvParser.worker.js отсутствует)
  },
  
  // Настройки таблицы (виртуализация E1)
  table: {
    virtualScroll: true,              // Включить виртуализацию
    rowHeight: 35,                    // Высота строки в пикселях
    overscan: 5,                      // Дополнительные строки за границами экрана
    threshold: 500,                   // Включать виртуализацию при > строк
  },
  
  // Настройки резервного копирования (D4)
  backup: {
    autoBackup: true,                 // Автоматический бэкап перед операциями
    maxBackups: 10,                   // Хранить последних N копий
    backupSheet: '_Backups',          // Название листа для бэкапов
    operations: ['delete', 'update', 'clear'], // Какие операции триггерят бэкап
  },
  
  // Логирование (D2)
  logging: {
    level: 'info',                    // debug, info, warn, error
    maxEntries: 1000,                 // Хранить в памяти
    persistToLocalStorage: true,      // Сохранять логи в localStorage
    showInConsole: true,              // Показывать в консоли
  },
  
  // UI настройки (C3, C4)
  ui: {
    skeletonEnabled: true,            // Показывать скелетоны
    skeletonCount: 15,                // Количество строк-скелетонов
    mobileBreakpoint: 768,            // Ширина экрана для мобильной версии (px)
    animationsEnabled: true,          // Анимации интерфейса
  },
  
  // Режим разработки
  dev: {
    debug: false,                     // Режим отладки
    mockData: false,                  // Использовать мок-данные вместо API
    hotReload: false,                 // Авто-перезагрузка при изменениях
  },
};

// Заморозка конфига от случайных изменений
if (typeof Object.freeze === 'function') {
  Object.freeze(CONFIG);
}

// Экспорт для разных окружений
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}