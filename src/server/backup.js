/**
 * =============================================================================
 * backup.js — резервные копии на отдельном листе таблицы
 * =============================================================================
 *
 * Лист по умолчанию: CONFIG.backup.backupSheet ('_Backups')
 * Вызывается при необходимости из служебных сценариев; в основном UI не задействован.
 *
 * ПОСЛЕ ПРАВОК: npm run build
 * =============================================================================
 */

/** Снимок активного листа перед операцией */
function getCurrentDataForBackup() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    return sheet.getDataRange().getValues();
  } catch (error) {
    console.error('Ошибка получения данных для бэкапа:', error);
    return [];
  }
}

/** Запись бэкапа в лист; хранится не более 10 последних записей */
function saveBackupToSheet(sheetName, backup) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['ID', 'Timestamp', 'Operation', 'Data', 'Size']);
    }

    sheet.appendRow([
      backup.id,
      backup.timestamp,
      backup.operation,
      JSON.stringify(backup.data),
      backup.size,
    ]);

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
