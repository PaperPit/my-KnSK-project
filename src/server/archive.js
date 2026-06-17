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
 *   getMoHistoryFromArchive(moName)     — история одной МО по всему архиву
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
    bumpArchiveDataVersion_();

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
var ARCHIVE_DATA_VERSION_KEY = 'knsk_archive_data_ver';
var ARCHIVE_COMPARE_CACHE_TTL = 300;

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

function getArchiveDataVersion_() {
  try {
    var v = CacheService.getScriptCache().get(ARCHIVE_DATA_VERSION_KEY);
    return v || '0';
  } catch (e) {
    return '0';
  }
}

function bumpArchiveDataVersion_() {
  try {
    var next = String(Number(getArchiveDataVersion_()) + 1);
    CacheService.getScriptCache().put(ARCHIVE_DATA_VERSION_KEY, next, 21600);
  } catch (e) {
    console.warn('archive: bump version не удался', e && e.message);
  }
  invalidateArchiveListCache_();
}

function slimReportForCompare_(report) {
  return {
    mosData: report.mosData || [],
    period: report.period || '',
    timestamp: report.timestamp || '',
  };
}

function readArchiveReportRows_(sheet, rowNums) {
  if (!rowNums || !rowNums.length) return [];
  if (rowNums.length === 1) {
    var r0 = rowNums[0];
    return [sheet.getRange(r0, 1, r0, 4).getValues()[0]];
  }

  var sorted = rowNums.slice().sort(function (a, b) {
    return a - b;
  });
  var minR = sorted[0];
  var maxR = sorted[sorted.length - 1];
  var block = sheet.getRange(minR, 1, maxR, 4).getValues();
  var byRow = {};
  for (var i = 0; i < block.length; i++) {
    byRow[minR + i] = block[i];
  }
  return rowNums.map(function (rowNum) {
    return byRow[rowNum];
  });
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
  var row = sheet.getRange(rowNum, 1, rowNum, 4).getValues()[0];
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

  var lo = Math.min(numA, numB);
  var hi = Math.max(numA, numB);
  var cacheKey = 'knsk_cmp_v2_' + getArchiveDataVersion_() + '_' + lo + '_' + hi;
  try {
    var cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (cacheReadErr) {
    console.warn('archive: compare cache read', cacheReadErr && cacheReadErr.message);
  }

  var index = buildArchiveIndex_(sheet);
  var rowA = index.idToRow[numA];
  var rowB = index.idToRow[numB];
  if (!rowA) throw new Error('Отчёт не найден (ID ' + numA + ')');
  if (!rowB) throw new Error('Отчёт не найден (ID ' + numB + ')');

  var rows = readArchiveReportRows_(sheet, [rowA, rowB]);
  var result = {
    reportA: slimReportForCompare_(parseArchiveReportRow_(rows[0])),
    reportB: slimReportForCompare_(parseArchiveReportRow_(rows[1])),
  };

  try {
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(result), ARCHIVE_COMPARE_CACHE_TTL);
  } catch (cacheWriteErr) {
    console.warn('archive: compare cache write', cacheWriteErr && cacheWriteErr.message);
  }

  return result;
}

var MO_HISTORY_CACHE_TTL = 300;

function normalizeMoKey_(name) {
  return String(name || '')
    .trim()
    .toLowerCase();
}

function toNumArchive_(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number' && !isNaN(v)) return v;
  var s = String(v).replace(/\s/g, '').replace(',', '.');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function buildMoFromArchiveRow_(r) {
  var plan = toNumArchive_(r.plan != null ? r.plan : r['План на год']);
  var fact = toNumArchive_(r.fact != null ? r.fact : r['Общий итог']);
  var percentRaw = r.percent != null ? toNumArchive_(r.percent) : plan ? (fact / plan) * 100 : 0;
  return {
    name: r.name || r['Наименование МО'] || 'МО',
    plan: plan,
    fact: fact,
    percent: percentRaw,
    growth: toNumArchive_(r.growth != null ? r.growth : r['Динамика']),
    colon: toNumArchive_(r.colon != null ? r.colon : r['Прошли колоноскопию']),
    zno: toNumArchive_(r.zno != null ? r.zno : r['ЗНО']),
    noDev: toNumArchive_(r.noDev != null ? r.noDev : r['Нет отклонений']),
    hasDev: toNumArchive_(r.hasDev != null ? r.hasDev : r['Есть отклонения']),
  };
}

function buildMosFromArchiveData_(data) {
  if (!data || !data.length) return [];
  var mos = [];
  for (var i = 0; i < data.length; i++) {
    mos.push(buildMoFromArchiveRow_(data[i]));
  }
  return mos;
}

function moToHistoryPoint_(mo, reportId, dateStr, period) {
  var hasDev = mo.hasDev || 0;
  var colon = mo.colon || 0;
  return {
    reportId: reportId,
    dateStr: dateStr,
    period: period || '',
    fact: mo.fact,
    plan: mo.plan,
    percent: mo.percent,
    growth: mo.growth,
    colon: colon,
    hasDev: hasDev,
    noDev: mo.noDev,
    zno: mo.zno,
    coverage: hasDev > 0 ? (colon / hasDev) * 100 : 0,
  };
}

function findMoInArchiveReport_(report, reportId, dateValue, period, moKey) {
  var mos = buildMosFromArchiveData_(report.mosData || []);
  for (var i = 0; i < mos.length; i++) {
    if (normalizeMoKey_(mos[i].name) === moKey) {
      return moToHistoryPoint_(mos[i], reportId, formatArchiveDate_(dateValue), period || report.period || '');
    }
  }
  return null;
}

/**
 * Собрать историю МО из массива строк архива (для тестов и сервера).
 * rows: [[id, date, json, period], ...]
 */
function buildMoHistoryFromRows_(rows, moName) {
  var moKey = normalizeMoKey_(moName);
  if (!moKey) {
    return { points: [], meta: { totalReports: 0, matchedReports: 0, moName: '' } };
  }

  var points = [];
  var totalReports = 0;

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var reportId = Number(row[0]);
    if (!reportId || isNaN(reportId)) continue;
    totalReports += 1;
    try {
      var report = parseArchiveReportRow_(row);
      var point = findMoInArchiveReport_(report, reportId, row[1], row[3], moKey);
      if (point) points.push(point);
    } catch (e) {
      // пропускаем повреждённые строки
    }
  }

  points.sort(function (a, b) {
    return a.reportId - b.reportId;
  });

  return {
    points: points,
    meta: {
      totalReports: totalReports,
      matchedReports: points.length,
      moName: moName,
    },
  };
}

function getMoHistoryCacheKey_(moName) {
  return 'mo_history_v1_' + normalizeMoKey_(moName);
}

function getCachedMoHistory_(moName) {
  try {
    var cached = CacheService.getScriptCache().get(getMoHistoryCacheKey_(moName));
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.warn('archive: чтение кэша истории МО не удалось', e && e.message);
  }
  return null;
}

function putCachedMoHistory_(moName, payload) {
  try {
    CacheService.getScriptCache().put(
      getMoHistoryCacheKey_(moName),
      JSON.stringify(payload),
      MO_HISTORY_CACHE_TTL
    );
  } catch (e) {
    console.warn('archive: запись кэша истории МО не удалась', e && e.message);
  }
}

/** История показателей одной МО по всем отчётам архива */
function getMoHistoryFromArchive(moName) {
  if (!moName || !String(moName).trim()) {
    throw new Error('Не указано название МО');
  }

  var cached = getCachedMoHistory_(moName);
  if (cached) return cached;

  var sheet = getArchiveSheet_();
  if (!sheet) {
    return {
      points: [],
      meta: { totalReports: 0, matchedReports: 0, moName: moName },
    };
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return {
      points: [],
      meta: { totalReports: 0, matchedReports: 0, moName: moName },
    };
  }

  var values = sheet.getRange(2, 1, lastRow, 4).getValues();
  var result = buildMoHistoryFromRows_(values, moName);
  putCachedMoHistory_(moName, result);
  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseArchiveReportRow_,
    buildArchiveIndex_,
    getPreviousArchiveIdFromList_,
    formatArchiveDate_,
    normalizeMoKey_,
    buildMoHistoryFromRows_,
    buildMosFromArchiveData_,
    moToHistoryPoint_,
  };
}
