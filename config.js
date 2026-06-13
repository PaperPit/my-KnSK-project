/**
 * =============================================================================
 * config.js — ЕДИНЫЙ источник настроек проекта (сервер Google Apps Script)
 * =============================================================================
 *
 * ГЛАВНЫЕ КОНСТАНТЫ РАСЧЁТОВ (меняйте здесь):
 *   PLAN_YEAR      — годовой план КнСК (220 000)
 *   PLAN_WEEKLY    — недельный ориентир (4 583)
 *   PLAN_THRESHOLD — порог сигнала «низкий % плана» (70)
 *
 * Как попадают в браузер:
 *   config.js → getClientConfigJson() в webapp.js → window.CONFIG в Index/Viewer
 *
 * ВАЖНО: тег <script src="config.js"> в HTML НЕ работает в GAS — файл серверный.
 *
 * ПОСЛЕ ПРАВОК: clasp push (config.js не проходит через npm run build)
 * =============================================================================
 */
var PLAN_YEAR = 220000;
var PLAN_WEEKLY = 4583;
var PLAN_THRESHOLD = 70;

const CONFIG = {
  plans: {
    year: PLAN_YEAR,
    weekly: PLAN_WEEKLY,
    threshold: PLAN_THRESHOLD,
  },

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
    maxFileSize: 100 * 1024 * 1024,
    chunkSize: 1024 * 1024,
    defaultDelimiter: ',',
    encoding: 'UTF-8',
    useWorker: false,
  },

  table: {
    virtualScroll: false,
    rowHeight: 35,
    overscan: 5,
    threshold: 500,
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
    skeletonEnabled: false,
    skeletonCount: 15,
    mobileBreakpoint: 768,
    animationsEnabled: true,
    cdn: {
      chartJs: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
      chartDataLabels:
        'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js',
      echarts: 'https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js',
      fontAwesome: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    },
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