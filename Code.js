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
    template.planWeekly = 4583;
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
    
    // Если архива нет, создаем с правильными заголовками
    if (!archiveSheet) {
      archiveSheet = ss.insertSheet('Архив');
      archiveSheet.appendRow(['ID', 'Дата сохранения', 'Данные (JSON)', 'Период']);
    }
    
    // Проверяем заголовки (защита от будущих проблем)
    const lastRow = archiveSheet.getLastRow();
    if (lastRow === 0) {
      archiveSheet.appendRow(['ID', 'Дата сохранения', 'Данные (JSON)', 'Период']);
    } else {
      const firstRow = archiveSheet.getRange(1, 1, 1, 4).getValues()[0];
      if (firstRow[0] !== 'ID') {
        // Заголовки повреждены, вставляем правильные
        archiveSheet.insertRowBefore(1);
        archiveSheet.getRange(1, 1, 1, 4).setValues([['ID', 'Дата сохранения', 'Данные (JSON)', 'Период']]);
      }
    }
    
    const now = new Date();
    const json = JSON.stringify(reportData);
    
    // Получаем следующий ID
    const dataRows = archiveSheet.getLastRow() - 1; // минус заголовок
    const newId = dataRows + 1;
    
    archiveSheet.appendRow([newId, now, json, reportData.period || '']);
    
    return {
      message: `✅ Отчёт сохранён в архив с ID ${newId}`,
      id: newId,
      timestamp: now.toLocaleDateString('ru-RU')
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
    
    // Получаем данные со 2-й строки (после заголовков)
    const range = sheet.getRange(2, 1, lastRow, 2); // Колонки A и B (все строки данных)
    const values = range.getValues();
    
    const list = [];
    for (let i = 0; i < values.length; i++) {
      const id = values[i][0];
      const dateValue = values[i][1];
      
      // Пропускаем строки с некорректным ID
      if (!id || isNaN(parseInt(id))) continue;
      
      let dateStr = '';
      if (dateValue instanceof Date) {
        dateStr = `${dateValue.getDate().toString().padStart(2, '0')}.${(dateValue.getMonth() + 1).toString().padStart(2, '0')}.${dateValue.getFullYear()}`;
      } else if (typeof dateValue === 'string') {
        dateStr = dateValue.split('T')[0];
      } else {
        dateStr = String(dateValue);
      }
      
      list.push({
        id: parseInt(id),
        dateStr: dateStr
      });
    }
    
    // Сортируем по ID (новые сверху)
    list.sort((a, b) => b.id - a.id);
    
    console.log(`Найдено ${list.length} отчётов в архиве`);
    return list;
  } catch (error) {
    console.error('Ошибка получения списка архива:', error);
    return [];
  }
}

// Получение конкретного архивного отчёта по ID
function getArchivedReportById(id) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Архив');
    
    if (!sheet) throw new Error('Лист Архив не найден');
    
    const numId = Number(id);
    if (isNaN(numId)) throw new Error('Некорректный ID отчёта');
    
    const data = sheet.getDataRange().getValues();
    const rowIndex = data.findIndex(function(row) {
      return Number(row[0]) === numId;
    });
    
    if (rowIndex === -1) throw new Error('Отчёт не найден (ID ' + numId + ')');
    
    const row = data[rowIndex];
    let report;
    try {
      report = typeof row[2] === 'string' ? JSON.parse(row[2]) : row[2];
    } catch (parseErr) {
      throw new Error('Повреждённые данные отчёта в архиве');
    }
    
    if (!report.mosData && report.MOSData) report.mosData = report.MOSData;
    if (typeof report.mosData === 'string') {
      try { report.mosData = JSON.parse(report.mosData); } catch (e) { report.mosData = []; }
    }
    if (!Array.isArray(report.mosData)) report.mosData = [];
    
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
function replaceBrokenArchive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const oldSheet = ss.getSheetByName('Архив');
  const tempSheet = ss.getSheetByName('Архив_temp');
  
  if (!tempSheet) {
    console.log('❌ Лист Архив_temp не найден');
    return;
  }
  
  // Удаляем старый сломанный архив
  if (oldSheet) {
    ss.deleteSheet(oldSheet);
    console.log('🗑️ Старый лист "Архив" удалён');
  }
  
  // Переименовываем временный
  tempSheet.setName('Архив');
  console.log('✅ Лист переименован в "Архив"');
  console.log('🎉 Архив восстановлен!');
  
  return 'Архив успешно восстановлен!';
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