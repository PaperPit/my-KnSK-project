// ==================== ОСНОВНАЯ ФУНКЦИЯ ВХОДА ====================
function doGet(e) {
  // Проверяем параметр viewer в URL
  if (e && e.parameter && e.parameter.viewer === '1') {
    // Режим ПРОСМОТРА (Viewer.html)
    const template = HtmlService.createTemplateFromFile('Viewer');
    template.reportId = e.parameter.id || null;
    return template.evaluate()
      .setTitle('Просмотр отчёта Онкоскрининг')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else {
    // Режим РЕДАКТОРА (Index.html) – по умолчанию
    const template = HtmlService.createTemplateFromFile('Index');
    template.planWeekly = 3333;
    return template.evaluate()
      .setTitle('Онкоскрининг — Редактор')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

// ==================== D4: ФУНКЦИИ ДЛЯ РЕЗЕРВНОГО КОПИРОВАНИЯ ====================

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
    
    // Ограничиваем количество бэкапов
    const maxBackups = 10;
    const totalRows = sheet.getLastRow();
    if (totalRows > maxBackups + 1) {
      sheet.deleteRows(maxBackups + 2, totalRows - maxBackups - 1);
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка сохранения бэкапа:', error);
    return false;
  }
}

// Восстановление из бэкапа
function restoreFromBackup(backupData) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    sheet.clear();
    if (backupData && backupData.length > 0) {
      sheet.getRange(1, 1, backupData.length, backupData[0].length).setValues(backupData);
    }
    return true;
  } catch (error) {
    console.error('Ошибка восстановления из бэкапа:', error);
    return false;
  }
}

// Удаление старого бэкапа
function deleteBackupFromSheet(sheetName, backupId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return false;
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === backupId) {
        sheet.deleteRow(i + 1);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Ошибка удаления бэкапа:', error);
    return false;
  }
}

// ==================== РАБОТА С АРХИВОМ ====================

// Сохранение отчёта в архив
function saveReportToArchive(reportData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let archiveSheet = ss.getSheetByName('Архив');
    if (!archiveSheet) {
      archiveSheet = ss.insertSheet('Архив');
      archiveSheet.appendRow(['ID', 'Дата сохранения', 'Данные (JSON)', 'Период']);
    }
    
    const now = new Date();
    // ✅ Сохраняем как ISO строку для надежности
    const dateISO = now.toISOString();  // 2026-05-19T12:00:00.000Z
    const dateDisplay = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
    
    const json = JSON.stringify(reportData);
    const newId = archiveSheet.getLastRow();
    
    // ✅ Сохраняем оба формата: ISO для порядка, Display для показа
    archiveSheet.appendRow([newId, dateISO, json, reportData.period || '']);
    
    return {
      message: `✅ Отчёт сохранён в архив: ${dateDisplay}`,
      id: newId,
      timestamp: dateDisplay
    };
  } catch (error) {
    console.error('Ошибка сохранения в архив:', error);
    throw new Error('Не удалось сохранить отчёт: ' + error.message);
  }
}

// Получение списка архивных отчётов
function getArchivedReportsList() {
  try {
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
    
    const range = sheet.getRange(2, 1, lastRow - 1, 2);
    const values = range.getValues();
    
    const list = [];
    for (let i = 0; i < values.length; i++) {
      const id = values[i][0];
      const dateValue = values[i][1];
      let dateStr = '';
      
      // ✅ Единообразное преобразование даты
      if (dateValue instanceof Date) {
        // Если это Date объект
        const d = dateValue;
        dateStr = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
      } else if (typeof dateValue === 'string') {
        // Если строка, проверяем формат
        if (dateValue.includes('T')) {
          // ISO формат: 2026-05-19T12:00:00.000Z
          const d = new Date(dateValue);
          if (!isNaN(d.getTime())) {
            dateStr = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
          } else {
            dateStr = dateValue.split('T')[0]; // fallback
          }
        } else {
          // Уже формат dd.mm.yyyy
          dateStr = dateValue;
        }
      } else {
        dateStr = String(dateValue);
      }
      
      list.push({
        id: id,
        dateStr: dateStr
      });
    }
    
    // ✅ Сортируем по ID (новые сверху)
    list.sort((a, b) => b.id - a.id);
    
    return list;
  } catch (error) {
    console.error('Ошибка получения списка архива:', error);
    return [];
  }
}
  function migrateArchiveDates() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Архив');
    
    if (!sheet) {
      console.log('Лист Архив не найден');
      return;
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    
    const range = sheet.getRange(2, 2, lastRow - 1, 1);
    const dates = range.getValues();
    let fixed = 0;
    
    for (let i = 0; i < dates.length; i++) {
      const oldValue = dates[i][0];
      let newValue = oldValue;
      
      if (typeof oldValue === 'string' && oldValue.includes('.')) {
        const parts = oldValue.split('.');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const dateObj = new Date(year, month, day);
          if (!isNaN(dateObj.getTime())) {
            newValue = dateObj.toISOString();
            sheet.getRange(i + 2, 2).setValue(newValue);
            fixed++;
          }
        }
      }
    }
    
    console.log(`Мигрировано ${fixed} записей в ISO формат`);
    return `Мигрировано ${fixed} записей`;
  }

// Получение конкретного архивного отчёта по ID
function getArchivedReportById(id) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Архив');
    
    if (!sheet) throw new Error('Лист Архив не найден');
    
    const data = sheet.getDataRange().getValues();
    const rowIndex = data.findIndex(row => row[0] === id);
    
    if (rowIndex === -1) throw new Error('Отчёт не найден');
    
    const row = data[rowIndex];
    const report = JSON.parse(row[2]);
    
    const dateValue = row[1];
    if (dateValue instanceof Date) {
      report.timestamp = `${dateValue.getDate().toString().padStart(2, '0')}.${(dateValue.getMonth() + 1).toString().padStart(2, '0')}.${dateValue.getFullYear()}`;
    } else {
      report.timestamp = String(dateValue).split(' ')[0];
    }
    
    return report;
  } catch (error) {
    console.error('Ошибка получения отчёта по ID:', error);
    throw new Error('Не удалось загрузить отчёт: ' + error.message);
  }
}

// ==================== ДОПОЛНИТЕЛЬНО: ЧТЕНИЕ ИЗ ЛИСТА "ДАННЫЕ" ====================
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