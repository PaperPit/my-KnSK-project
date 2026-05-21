function exportRangeA1I49toCSV() {
  // Получаем активную таблицу
  var sheet = SpreadsheetApp.getActiveSheet();
  
  // Указываем диапазон A1:I49
  var range = sheet.getRange("A1:I48");
  
  // Получаем данные из диапазона
  var data = range.getValues();
  
  // Преобразуем данные в CSV формат
  var csvContent = convertToCSV(data);
  
  // Создаём файл для скачивания
  downloadCSV(csvContent, 'export_range_A1_I48.csv');
}

function convertToCSV(data) {
  var csvRows = [];
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var processedRow = [];
    
    for (var j = 0; j < row.length; j++) {
      var cell = row[j];
      
      // Обрабатываем различные типы данных
      if (cell === undefined || cell === null) {
        cell = '';
      } else if (cell instanceof Date) {
        // Форматируем дату в ISO строку
        cell = Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      } else if (typeof cell === 'string') {
        // Экранируем кавычки и обрабатываем запятые
        cell = cell.replace(/"/g, '""');
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          cell = '"' + cell + '"';
        }
      } else if (typeof cell === 'number') {
        // Заменяем точку на запятую для десятичных (опционально)
        cell = cell.toString().replace('.', ',');
      }
      
      processedRow.push(cell);
    }
    
    csvRows.push(processedRow.join(','));
  }
  
  return csvRows.join('\n');
}

function downloadCSV(csvContent, filename) {
  // Кодируем содержимое для скачивания
  var encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
  
  // Создаём HTML диалог для скачивания
  var htmlOutput = HtmlService.createHtmlOutput(
    '<script>' +
    'window.location.href = "' + encodedUri + '";' +
    'google.script.host.close();' +
    '</script>'
  ).setWidth(300).setHeight(100);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Скачивание CSV файла');
}

// Дополнительная функция: скачать только видимые строки (если есть фильтры)
function exportVisibleRangeA1I50toCSV() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var range = sheet.getRange("A1:I48");
  
  // Получаем только видимые строки (учитывая фильтры)
  var data = range.getDisplayValues();
  var csvContent = convertToCSV(data);
  downloadCSV(csvContent, 'export_visible_range_A1_I48.csv');
}

// Дополнительная функция: добавить кнопку в меню
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 Экспорт в CSV')
    .addItem('Экспорт диапазона A1:I49', 'exportRangeA1I49toCSV')
    .addItem('Экспорт только видимых строк (с фильтрами)', 'exportVisibleRangeA1I50toCSV')
    .addToUi();
}