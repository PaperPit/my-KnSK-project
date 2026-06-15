/**
 * =============================================================================
 * archive.js — лист «Архив» в Google Таблице
 * =============================================================================
 *
 * Структура листа (4 колонки):
 *   A: ID | B: Дата сохранения | C: Данные (JSON) | D: Период
 *
 * Публичные функции для google.script.run / GASAdapter:
 *   saveReportToArchive(reportData)     — сохранить снимок отчёта
 *   getArchivedReportsList()            — список {id, dateStr} для селектов
 *   getArchivedReportById(id)           — один отчёт
 *   getArchivedReportsForCompare(a, b)  — два отчёта одним запросом (сравнение)
 *   getArchivedReportWithPrevious(id)   — отчёт + предыдущий (для дельт KPI)
 *   getArchiveBootstrap(requestedId)    — список + отчёт одним вызовом (viewer)
 *
 * Функции с суффиксом _ — внутренние (кэш, индекс строк).
 *
 * ПОСЛЕ ПРАВОК: npm run build → clasp push
 * =============================================================================
 */

/** Сохранение полного снимка: mosData, weeksData, doneText, plansText, period */
function saveReportToArchive(reportData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let archiveSheet = ss.getSheetByName('Архив');

    if (!archiveSheet) {
      archiveSheet = ss.insertSheet('Архив');
      archiveSheet.appendRow(['ID', 'Дата сохранения', 'Данные (JSON)', 'Период']);
    }

    const lastRow = archiveSheet.getLastRow();
    if (lastRow === 0) {
      archiveSheet.appendRow(['ID', 'Дата сохранения', 'Данные (JSON)', 'Период']);
    } else {
      const firstRow = archiveSheet.getRange(1, 1, 1, 4).getValues()[0];
      if (firstRow[0] !== 'ID') {
        archiveSheet.insertRowBefore(1);
        archiveSheet
          .getRange(1, 1, 1, 4)
          .setValues([['ID', 'Дата сохранения', 'Данные (JSON)', 'Период']]);
      }
    }

    const now = new Date();
    const json = JSON.stringify(reportData);
    const dataRows = archiveSheet.getLastRow() - 1;
    const newId = dataRows + 1;

    archiveSheet.appendRow([newId, now, json, reportData.period || '']);
    invalidateArchiveListCache_();

    return {
      message: `✅ Отчёт сохранён в архив с ID ${newId}`,
      id: newId,
      timestamp: now.toLocaleDateString('ru-RU'),
    };
  } catch (error) {
    console.error('Ошибка сохранения в архив:', error);
    throw new Error('Не удалось сохранить отчёт: ' + error.message);
  }
}

/** Кэш списка архива на 5 минут — меньше обращений к таблице */
var ARCHIVE_LIST_CACHE_KEY = 'knsk_archive_list_v1';
var ARCHIVE_LIST_CACHE_TTL = 300;

function getArchiveSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Архив');
}

function formatArchiveDate_(dateValue) {
  if (dateValue instanceof Date) {
    return (
      dateValue.getDate().toString().padStart(2, '0') +
      '.' +
      (dateValue.getMonth() + 1).toString().padStart(2, '0') +
      '.' +
      dateValue.getFullYear()
    );
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
    try {
      report.mosData = JSON.parse(report.mosData);
    } catch (e) {
      report.mosData = [];
    }
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
  list.sort(function (a, b) {
    return b.id - a.id;
  });
  return { list: list, idToRow: idToRow };
}

function getCachedArchiveList_() {
  try {
    var cached = CacheService.getScriptCache().get(ARCHIVE_LIST_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.warn('archive: чтение кэша списка не удалось', e && e.message);
  }
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
  } catch (e) {
    console.warn('archive: запись кэша списка не удалась', e && e.message);
  }
}

function invalidateArchiveListCache_() {
  try {
    CacheService.getScriptCache().remove(ARCHIVE_LIST_CACHE_KEY);
  } catch (e) {
    console.warn('archive: сброс кэша списка не удался', e && e.message);
  }
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

/**
 * Один запрос при открытии Viewer: список отчётов + выбранный отчёт + предыдущий.
 * requestedId — из URL ?id= или null (тогда последний по ID).
 */
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
    reportId: targetId,
  };
}

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

function getArchivedReportWithPrevious(id) {
  var sheet = getArchiveSheet_();
  if (!sheet) throw new Error('Лист Архив не найден');
  var index = buildArchiveIndex_(sheet);
  return getArchivedReportWithPreviousFromIndex_(sheet, index, id);
}

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

/** Два отчёта за один round-trip (сравнение архивов) */
function getArchivedReportsForCompare(idA, idB) {
  var sheet = getArchiveSheet_();
  if (!sheet) throw new Error('Лист Архив не найден');

  var numA = Number(idA);
  var numB = Number(idB);
  if (isNaN(numA) || isNaN(numB)) throw new Error('Некорректный ID отчёта');

  var index = buildArchiveIndex_(sheet);
  var rowA = index.idToRow[numA];
  var rowB = index.idToRow[numB];
  if (!rowA) throw new Error('Отчёт не найден (ID ' + numA + ')');
  if (!rowB) throw new Error('Отчёт не найден (ID ' + numB + ')');

  return {
    reportA: readArchiveReportAtRow_(sheet, rowA),
    reportB: readArchiveReportAtRow_(sheet, rowB),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseArchiveReportRow_,
    buildArchiveIndex_,
    getPreviousArchiveIdFromList_,
    formatArchiveDate_,
  };
}
