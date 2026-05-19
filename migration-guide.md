# Миграция существующего кода - my-KnSK-project

## ✅ Гарантии совместимости

Все улучшения добавлены **без изменения оригинального кода**. Ваш существующий функционал продолжит работать без каких-либо правок.

## 📋 Структура добавленных файлов

```

my-KnSK-project/
├── config.js                          # A4: Конфигурация
├── migration-guide.md                 # Этот файл
├── src/
│   ├── core/
│   │   ├── GoogleAppsScriptAdapter.js # A1: Обёртка для google.script.run
│   │   ├── EventBus.js                # A2: Шина событий
│   │   ├── StateManager.js            # A3: Менеджер состояния
│   │   └── Logger.js                  # D2: Логирование
│   ├── ui/
│   │   ├── ResponsiveLayout.css       # C3: Адаптивный дизайн
│   │   ├── SkeletonLoader.js          # C4: Скелетоны загрузки
│   │   └── VirtualTable.js            # E1: Виртуализация таблиц
│   ├── workers/
│   │   └── csvParser.worker.js        # E4: Web Worker для CSV
│   ├── backup/
│   │   └── BackupManager.js           # D4: Резервное копирование
│   └── docs/
│       └── DocGenerator.js            # F1: Генератор документации

```

## 🔧 Пошаговая интеграция

### Шаг 1: Добавьте файлы в проект Google Apps Script

Через интерфейс Apps Script или clasp:

1. Создайте папку `src`
2. Внутри создайте подпапки: `core`, `ui`, `workers`, `backup`, `docs`
3. Скопируйте содержимое каждого файла в соответствующий файл в проекте

### Шаг 2: Подключите модули в `Index.html`

Откройте ваш `Index.html` и добавьте следующий код **перед закрывающим тегом `</body>`**:

```html
<!-- ========================================== -->
<!-- НОВЫЕ МОДУЛИ my-KnSK (не ломают старый код) -->
<!-- ========================================== -->

<!-- A4: Конфигурация (ДОЛЖЕН БЫТЬ ПЕРВЫМ) -->
<script src="config.js"></script>

<!-- D2: Логирование -->
<script src="src/core/Logger.js"></script>

<!-- A2: Шина событий -->
<script src="src/core/EventBus.js"></script>

<!-- A3: Менеджер состояния -->
<script src="src/core/StateManager.js"></script>

<!-- A1: Адаптер для google.script.run -->
<script src="src/core/GoogleAppsScriptAdapter.js"></script>

<!-- C3: Адаптивный CSS -->
<link rel="stylesheet" href="src/ui/ResponsiveLayout.css">

<!-- C4: Скелетоны загрузки -->
<script src="src/ui/SkeletonLoader.js"></script>

<!-- E1: Виртуальная таблица -->
<script src="src/ui/VirtualTable.js"></script>

<!-- D4: Резервное копирование -->
<script src="src/backup/BackupManager.js"></script>

<!-- F1: Генератор документации -->
<script src="src/docs/DocGenerator.js"></script>

<!-- E4: Регистрация Web Worker для CSV -->
<script>
if (window.Worker && window.CONFIG?.csv?.useWorker) {
    const csvWorker = new Worker('src/workers/csvParser.worker.js');
    csvWorker.onmessage = function(e) {
        const data = e.data;
        if (data.type === 'complete') {
            console.log(`Парсинг завершён: ${data.totalRows} строк`);
            // Используйте данные
            window.processCSVData(data.data);
        } else if (data.type === 'progress') {
            console.log(`Прогресс: ${data.percentage.toFixed(1)}% (${data.rows} строк)`);
        } else if (data.type === 'error') {
            console.error('Ошибка парсинга CSV:', data.error);
        }
    };
    window.csvWorker = csvWorker;
}
</script>

<!-- Инициализация бэкапов -->
<script>
if (window.BackupManager && window.BackupManager.config.autoBackup) {
    // Автоматическое создание бэкапа перед важными операциями
    const originalDeleteRow = window.deleteRow;
    if (originalDeleteRow) {
        window.deleteRow = async function(rowId) {
            await window.BackupManager.withBackup(
                () => originalDeleteRow(rowId),
                'delete'
            );
        };
    }
}
</script>
```

### Шаг 3: Обновите `Code.js` (серверная часть)

Добавьте эти функции в ваш `Code.js` для поддержки бэкапов:

```
/**
 * D4: Функции для резервного копирования
 */

// Получение текущих данных для бэкапа
function getCurrentDataForBackup() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    return data;
  } catch (error) {
    console.error('Ошибка получения данных для бэкапа:', error);
    return [];
  }
}

// Сохранение бэкапа в отдельный лист
function saveBackupToSheet(sheetName, backup) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Добавляем заголовки если лист новый
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['ID', 'Timestamp', 'Operation', 'Data', 'Size']);
    }
    
    sheet.appendRow([
      backup.id,
      backup.timestamp,
      backup.operation,
      JSON.stringify(backup.data),
      backup.size
    ]);
    
    // Ограничиваем количество бэ
```

### Шаг 4: Настройте `config.js` под ваш проект

Отредактируйте параметры в `config.js`:

```