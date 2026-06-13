// ==================== ОСНОВНАЯ ФУНКЦИЯ ВХОДА ====================

function getClientConfigJson() {
  return JSON.stringify({
    plans: {
      year: PLAN_YEAR,
      weekly: PLAN_WEEKLY,
      threshold: PLAN_THRESHOLD,
    },
    api: CONFIG.api,
    csv: CONFIG.csv,
    table: CONFIG.table,
    backup: CONFIG.backup,
    logging: CONFIG.logging,
    ui: CONFIG.ui,
    dev: CONFIG.dev,
  });
}

function doGet(e) {
  const clientConfigJson = getClientConfigJson();
  // Проверяем параметр viewer в URL
  if (e && e.parameter && e.parameter.viewer === '1') {
    // Режим ПРОСМОТРА (Viewer.html)
    const template = HtmlService.createTemplateFromFile('Viewer');
    template.reportId = e.parameter.id || null;
    template.clientConfigJson = clientConfigJson;
    return template.evaluate()
      .setTitle('Просмотр отчёта Онкоскрининг')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else {
    // Режим РЕДАКТОРА (Index.html) – по умолчанию
    const template = HtmlService.createTemplateFromFile('Index');
    template.clientConfigJson = clientConfigJson;
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
    
    invalidateArchiveListCache_();
    
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

// ==================== РАБОТА С АРХИВОМ (оптимизированное чтение) ====================

var ARCHIVE_LIST_CACHE_KEY = 'knsk_archive_list_v1';
var ARCHIVE_LIST_CACHE_TTL = 300;

function getArchiveSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Архив');
}

function formatArchiveDate_(dateValue) {
  if (dateValue instanceof Date) {
    return dateValue.getDate().toString().padStart(2, '0') + '.' +
      (dateValue.getMonth() + 1).toString().padStart(2, '0') + '.' +
      dateValue.getFullYear();
  }
  if (typeof dateValue === 'string') return dateValue.split('T')[0];
  return String(dateValue);
}

function parseArchiveReportRow_(row) {
  var report;
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
  report.timestamp = formatArchiveDate_(row[1]);
  return report;
}

function buildArchiveIndex_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { list: [], idToRow: {} };

  var values = sheet.getRange(2, 1, lastRow, 2).getValues();
  var list = [];
  var idToRow = {};

  for (var i = 0; i < values.length; i++) {
    var id = Number(values[i][0]);
    if (!id || isNaN(id)) continue;
    list.push({ id: id, dateStr: formatArchiveDate_(values[i][1]) });
    idToRow[id] = i + 2;
  }
  list.sort(function (a, b) { return b.id - a.id; });
  return { list: list, idToRow: idToRow };
}

function getCachedArchiveList_() {
  try {
    var cached = CacheService.getScriptCache().get(ARCHIVE_LIST_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {}
  return null;
}

function putCachedArchiveList_(list) {
  try {
    if (list && list.length) {
      CacheService.getScriptCache().put(
        ARCHIVE_LIST_CACHE_KEY,
        JSON.stringify(list),
        ARCHIVE_LIST_CACHE_TTL
      );
    }
  } catch (e) {}
}

function invalidateArchiveListCache_() {
  try {
    CacheService.getScriptCache().remove(ARCHIVE_LIST_CACHE_KEY);
  } catch (e) {}
}

function getArchiveList_(sheet) {
  var cached = getCachedArchiveList_();
  if (cached) return cached;
  var index = buildArchiveIndex_(sheet);
  putCachedArchiveList_(index.list);
  return index.list;
}

function getPreviousArchiveIdFromList_(list, currentId) {
  var numId = Number(currentId);
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === numId) {
      if (i >= list.length - 1) return null;
      return list[i + 1].id;
    }
  }
  return null;
}

function readArchiveReportAtRow_(sheet, rowNum) {
  var row = sheet.getRange(rowNum, 1, 1, 4).getValues()[0];
  return parseArchiveReportRow_(row);
}

function getArchivedReportWithPreviousFromIndex_(sheet, index, id) {
  var numId = Number(id);
  var rowNum = index.idToRow[numId];
  if (!rowNum) throw new Error('Отчёт не найден (ID ' + numId + ')');

  var report = readArchiveReportAtRow_(sheet, rowNum);
  var previous = null;
  var prevId = getPreviousArchiveIdFromList_(index.list, numId);
  if (prevId != null && index.idToRow[prevId]) {
    try {
      previous = readArchiveReportAtRow_(sheet, index.idToRow[prevId]);
    } catch (e) {
      previous = null;
    }
  }
  return { report: report, previous: previous };
}

// Список + последний (или указанный) отчёт — один вызов с клиента
function getArchiveBootstrap(requestedId) {
  var sheet = getArchiveSheet_();
  if (!sheet) {
    return { list: [], report: null, previous: null, reportId: null };
  }

  var index = buildArchiveIndex_(sheet);
  putCachedArchiveList_(index.list);

  if (!index.list.length) {
    return { list: [], report: null, previous: null, reportId: null };
  }

  var targetId = requestedId ? Number(requestedId) : index.list[0].id;
  if (isNaN(targetId) || !index.idToRow[targetId]) {
    targetId = index.list[0].id;
  }

  var payload = getArchivedReportWithPreviousFromIndex_(sheet, index, targetId);
  return {
    list: index.list,
    report: payload.report,
    previous: payload.previous,
    reportId: targetId
  };
}

// Получение списка архивных отчётов
function getArchivedReportsList() {
  try {
    var sheet = getArchiveSheet_();
    if (!sheet) {
      console.log('Лист "Архив" не найден');
      return [];
    }
    var list = getArchiveList_(sheet);
    console.log('Найдено ' + list.length + ' отчётов в архиве');
    return list;
  } catch (error) {
    console.error('Ошибка получения списка архива:', error);
    return [];
  }
}

// Отчёт + предыдущий отчёт одним вызовом (для дельт KPI)
function getArchivedReportWithPrevious(id) {
  var sheet = getArchiveSheet_();
  if (!sheet) throw new Error('Лист Архив не найден');
  var index = buildArchiveIndex_(sheet);
  return getArchivedReportWithPreviousFromIndex_(sheet, index, id);
}

// Получение конкретного архивного отчёта по ID
function getArchivedReportById(id) {
  try {
    var sheet = getArchiveSheet_();
    if (!sheet) throw new Error('Лист Архив не найден');

    var numId = Number(id);
    if (isNaN(numId)) throw new Error('Некорректный ID отчёта');

    var index = buildArchiveIndex_(sheet);
    var rowNum = index.idToRow[numId];
    if (!rowNum) throw new Error('Отчёт не найден (ID ' + numId + ')');

    return readArchiveReportAtRow_(sheet, rowNum);
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

// ==================== МИГРАЦИЯ ПЛАНОВ МО В АРХИВЕ (160k → 220k, 2026) ====================

function normalizeMoName_(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, '');
}

function extractFactFromMo_(item) {
  var raw = item.fact != null ? item.fact : item['Общий итог'];
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number' && !isNaN(raw)) return raw;
  var s = String(raw).trim();
  var m = s.match(/(\d[\d\s]*)/);
  return m ? parseInt(m[1].replace(/\s/g, ''), 10) || 0 : 0;
}

function lookupNewPlan2026_(name, mapping) {
  if (!name) return null;
  var trimmed = String(name).trim();
  if (mapping.byShortName[trimmed] != null) return mapping.byShortName[trimmed];
  var norm = normalizeMoName_(trimmed);
  if (mapping.byNormalizedShortName[norm] != null) return mapping.byNormalizedShortName[norm];
  return null;
}

function updateMoPlanFields_(item, newPlan) {
  var oldPlan = Number(item.plan != null ? item.plan : item['План на год'] || 0) || 0;
  if (Math.round(oldPlan) === Math.round(newPlan)) return false;

  if (item.plan != null) item.plan = newPlan;
  if (item['План на год'] != null) item['План на год'] = String(newPlan);

  var fact = extractFactFromMo_(item);
  var percent = newPlan ? (fact / newPlan) * 100 : 0;
  if (item.percent != null) item.percent = percent;
  if (item['%'] != null) item['%'] = percent.toFixed(1) + '%';

  return true;
}

function updateReportPlans2026_(report, mapping) {
  var result = { changed: 0, notFound: [], details: [] };

  function processItem(item) {
    if (!item || typeof item !== 'object') return;

    var candidateNames = [
      item.name,
      item['Наименование МО'],
      item['Наименование'],
      item['Краткое наименование'],
    ].filter(function (n) { return n != null && String(n).trim() !== ''; });

    var newPlan = null;
    var matchedName = '';
    for (var i = 0; i < candidateNames.length; i++) {
      newPlan = lookupNewPlan2026_(candidateNames[i], mapping);
      if (newPlan != null) {
        matchedName = candidateNames[i];
        break;
      }
    }

    if (newPlan == null) {
      result.notFound.push(candidateNames[0] || '(без названия)');
      return;
    }

    if (updateMoPlanFields_(item, newPlan)) {
      result.changed++;
      result.details.push(matchedName + ': ' + newPlan);
    }
  }

  var mos = report.mosData || report.MOSData || report.data;
  if (typeof mos === 'string') {
    try { mos = JSON.parse(mos); } catch (e) { mos = []; }
  }

  if (Array.isArray(mos)) {
    mos.forEach(processItem);
    report.mosData = mos;
    if (report.MOSData) report.MOSData = mos;
    if (report.data) report.data = mos;
  }

  return result;
}

/**
 * Обновляет годовые планы МО во всех отчётах листа «Архив» по карте 2026 (220 000).
 *
 * Запуск из редактора Apps Script:
 *   1) migrateArchivePlansTo2026(true)  — просмотр, без записи
 *   2) migrateArchivePlansTo2026(false) — применить изменения
 */
function migrateArchivePlansTo2026(dryRun) {
  dryRun = dryRun !== false;
  var mapping = getPlanMapping2026();
  var sheet = getArchiveSheet_();

  if (!sheet) throw new Error('Лист «Архив» не найден');

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'В архиве нет отчётов';

  var ids = sheet.getRange(2, 1, lastRow, 1).getValues();
  var jsonCells = sheet.getRange(2, 3, lastRow, 1).getValues();

  var summary = {
    dryRun: dryRun,
    reportsTotal: lastRow - 1,
    reportsUpdated: 0,
    moPlansChanged: 0,
    notFound: {},
  };

  for (var i = 0; i < jsonCells.length; i++) {
    var reportId = ids[i][0];
    var rawJson = jsonCells[i][0];
    if (!rawJson) continue;

    var report;
    try {
      report = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    } catch (e) {
      console.warn('Пропуск отчёта ID ' + reportId + ': битый JSON');
      continue;
    }

    var updateResult = updateReportPlans2026_(report, mapping);
    if (updateResult.changed === 0) continue;

    summary.reportsUpdated++;
    summary.moPlansChanged += updateResult.changed;

    updateResult.notFound.forEach(function (name) {
      summary.notFound[name] = (summary.notFound[name] || 0) + 1;
    });

    if (!dryRun) {
      sheet.getRange(i + 2, 3).setValue(JSON.stringify(report));
      console.log('Обновлён отчёт ID ' + reportId + ': ' + updateResult.changed + ' МО');
    } else {
      console.log('[dry-run] Отчёт ID ' + reportId + ': ' + updateResult.changed + ' МО');
    }
  }

  if (!dryRun) {
    invalidateArchiveListCache_();
  }

  var notFoundList = Object.keys(summary.notFound);
  var message =
    (dryRun ? 'ПРОСМОТР (без записи). ' : 'ЗАПИСАНО. ') +
    'Отчётов: ' + summary.reportsTotal +
    ', обновлено: ' + summary.reportsUpdated +
    ', планов МО заменено: ' + summary.moPlansChanged;

  if (notFoundList.length) {
    message += '. Не найдены в новом плане: ' + notFoundList.join(', ');
  }

  console.log(message);
  return message;
}

// Вспомогательная функция для подключения HTML-файлов
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}