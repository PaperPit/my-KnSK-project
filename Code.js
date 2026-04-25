// ==================== ОСНОВНАЯ ФУНКЦИЯ ВХОДА ====================
function doGet(e) {
  // Проверяем параметр viewer в URL
  if (e.parameter.viewer === '1') {
    // Режим ПРОСМОТРА (Viewer.html)
    const template = HtmlService.createTemplateFromFile('Viewer');
    template.reportId = e.parameter.id || null; // передаём ID отчёта, если есть
    return template.evaluate()
      .setTitle('Просмотр отчёта Онкоскрининг')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else {
    // Режим РЕДАКТОРА (Index.html) – по умолчанию
    const template = HtmlService.createTemplateFromFile('Index');
    template.planWeekly = 3333; // можно передавать настройки
    return template.evaluate()
      .setTitle('Онкоскрининг — Редактор')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

// ==================== РАБОТА С АРХИВОМ ====================

// Сохранение отчёта в архив
function saveReportToArchive(reportData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let archiveSheet = ss.getSheetByName('Архив');
  if (!archiveSheet) {
    archiveSheet = ss.insertSheet('Архив');
    archiveSheet.appendRow(['Дата сохранения', 'Данные (JSON)']);
  }
  
  // Сохраняем дату как текст в формате ДД.ММ.ГГГГ
  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
  
  const json = JSON.stringify(reportData);
  archiveSheet.appendRow([dateStr, json]);
  
  const newId = archiveSheet.getLastRow() - 2;
  
  return {
    message: `✅ Отчёт сохранён в архив: ${dateStr}`,
    id: newId
  };
}

// Получение списка архивных отчётов
function getArchivedReportsList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Архив');
  
  if (!sheet) {
    console.log('Лист "Архив" не найден');
    return [];
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    console.log('В листе "Архив" нет данных');
    return [];
  }
  
  const range = sheet.getRange(2, 1, lastRow - 1, 1);
  const values = range.getValues();
  
  const list = [];
  for (let i = 0; i < values.length; i++) {
    const dateValue = values[i][0];
    let dateStr = '';
    
    if (dateValue instanceof Date) {
      // Форматируем дату в ДД.ММ.ГГГГ
      dateStr = `${dateValue.getDate().toString().padStart(2, '0')}.${(dateValue.getMonth() + 1).toString().padStart(2, '0')}.${dateValue.getFullYear()}`;
    } else {
      // Если это уже строка — берём как есть или обрезаем
      dateStr = String(dateValue).split(' ')[0]; // Берём только первую часть до пробела
    }
    
    list.push({
      id: i,
      dateStr: dateStr
    });
  }
  
  return list;
}
// Получение конкретного архивного отчёта по ID
function getArchivedReportById(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Архив');
  
  if (!sheet) throw new Error('Лист Архив не найден');
  
  const data = sheet.getDataRange().getValues();
  if (id + 1 >= data.length) throw new Error('Отчёт не найден');
  
  const row = data[id + 1];
  const report = JSON.parse(row[1]);
  
  const dateValue = row[0];
  if (dateValue instanceof Date) {
    report.timestamp = `${dateValue.getDate().toString().padStart(2, '0')}.${(dateValue.getMonth() + 1).toString().padStart(2, '0')}.${dateValue.getFullYear()}`;
  } else {
    report.timestamp = String(dateValue).split(' ')[0]; // Берём только дату
  }
  
  return report;
}

// ==================== ДОПОЛНИТЕЛЬНО: ЧТЕНИЕ ИЗ ЛИСТА "ДАННЫЕ" (если понадобится) ====================
function getCurrentData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Данные');
  
  if (!sheet) {
    console.log('Лист "Данные" не найден');
    return [];
  }
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow < 2) {
    console.log('В листе "Данные" нет строк с данными');
    return [];
  }
  
  const range = sheet.getRange(1, 1, lastRow, lastCol);
  const values = range.getValues();
  
  const headers = values[0].map(h => String(h).trim());
  const rows = values.slice(1).filter(row => row.some(cell => cell !== null && cell !== ''));
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] != null ? String(row[i]) : '';
    });
    return obj;
  });
}

// Вспомогательная функция для подключения HTML-файлов
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}