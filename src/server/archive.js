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
 *   getWeeklyDynamicsTrend(weekLimit)   — точки графика «Динамика КнСК» из архива
 *
 * Функции с суффиксом _ — внутренние (кэш, индекс строк).
 *
 * ПОСЛЕ ПРАВОК: npm run build → clasp push
 * =============================================================================
 */

/** Сохранение полного снимка: mosData, doneText, plansText, period (weeksData вычисляется из архива) */
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
var ARCHIVE_INDEX_CACHE_PREFIX = 'knsk_archive_index_v2_';
var ARCHIVE_LIST_CACHE_TTL = 300;
var ARCHIVE_DATA_VERSION_KEY = 'knsk_archive_data_ver';
var ARCHIVE_COMPARE_CACHE_TTL = 300;
var BOOTSTRAP_CACHE_PREFIX = 'knsk_bootstrap_v4_';
var BOOTSTRAP_CACHE_TTL = 300;

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

/** Предыдущий отчёт в bootstrap — только данные для KPI/таблицы. */
function slimReportForBootstrap_(report) {
  return {
    mosData: report.mosData || [],
    timestamp: report.timestamp || '',
  };
}

function getArchiveIndexCacheKey_() {
  return ARCHIVE_INDEX_CACHE_PREFIX + getArchiveDataVersion_();
}

function getCachedArchiveIndex_() {
  try {
    var cached = CacheService.getScriptCache().get(getArchiveIndexCacheKey_());
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.warn('archive: чтение кэша индекса не удалось', e && e.message);
  }
  return null;
}

function putCachedArchiveIndex_(index) {
  try {
    if (index && index.list) {
      CacheService.getScriptCache().put(
        getArchiveIndexCacheKey_(),
        JSON.stringify(index),
        ARCHIVE_LIST_CACHE_TTL
      );
      putCachedArchiveList_(index.list);
    }
  } catch (e) {
    console.warn('archive: запись кэша индекса не удалась', e && e.message);
  }
}

function getArchiveIndex_(sheet) {
  var cached = getCachedArchiveIndex_();
  if (cached && cached.list && cached.idToRow) return cached;
  var index = buildArchiveIndex_(sheet);
  putCachedArchiveIndex_(index);
  return index;
}

function getBootstrapCacheKey_(reportId) {
  return BOOTSTRAP_CACHE_PREFIX + getArchiveDataVersion_() + '_' + reportId;
}

function getCachedBootstrap_(reportId) {
  try {
    var cached = CacheService.getScriptCache().get(getBootstrapCacheKey_(reportId));
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.warn('archive: чтение кэша bootstrap не удалось', e && e.message);
  }
  return null;
}

function putCachedBootstrap_(reportId, payload) {
  try {
    CacheService.getScriptCache().put(
      getBootstrapCacheKey_(reportId),
      JSON.stringify(payload),
      BOOTSTRAP_CACHE_TTL
    );
  } catch (e) {
    console.warn('archive: запись кэша bootstrap не удалась', e && e.message);
  }
}

/**
 * Собрать ответ bootstrap из уже распарсенных отчётов (для тестов и сервера).
 */
function assembleBootstrapResponse_(index, targetId, currentReport, previousReport) {
  return {
    list: index.list,
    report: currentReport,
    previous: previousReport ? slimReportForBootstrap_(previousReport) : null,
    reportId: targetId,
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
  return getArchiveIndex_(sheet).list;
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

  var prevId = getPreviousArchiveIdFromList_(index.list, numId);
  var rowNums = [rowNum];
  if (prevId != null && index.idToRow[prevId]) {
    rowNums.push(index.idToRow[prevId]);
  }

  var rows = readArchiveReportRows_(sheet, rowNums);
  var report = parseArchiveReportRow_(rows[0]);
  var previous = null;
  if (rows.length > 1) {
    try {
      previous = slimReportForBootstrap_(parseArchiveReportRow_(rows[1]));
    } catch (e) {
      previous = null;
    }
  }
  return { report: report, previous: previous };
}

function buildWeeklyTrendFromParsed_(index, slice, parsedByRow) {
  var weeks = [];
  var i;
  for (i = slice.length - 1; i >= 0; i--) {
    var item = slice[i];
    var rowNum = index.idToRow[item.id];
    var report = parsedByRow[rowNum];
    if (!report) continue;
    var range = getDynamicsWeekMonSun_(report.timestamp || item.dateStr || '');
    if (!range) continue;
    weeks.push({
      start: range.start,
      end: range.end,
      value: sumArchiveDynamics_(report.mosData || []),
      reportId: item.id,
    });
  }
  return weeks;
}

/**
 * Один batch-read: текущий отчёт, previous и (при необходимости) строки для weeksTrend.
 */
function loadBootstrapPayload_(sheet, index, targetId, weekLimit) {
  var limit = weekLimit ? Math.min(Math.max(1, Number(weekLimit)), 24) : 5;
  var targetRow = index.idToRow[targetId];
  if (!targetRow) throw new Error('Отчёт не найден (ID ' + targetId + ')');

  var prevId = getPreviousArchiveIdFromList_(index.list, targetId);
  var seen = {};
  var rowNums = [];

  function pushRow(rowNum) {
    if (rowNum && !seen[rowNum]) {
      seen[rowNum] = true;
      rowNums.push(rowNum);
    }
  }

  pushRow(targetRow);
  if (prevId != null) pushRow(index.idToRow[prevId]);

  var cachedTrend = getCachedWeeklyTrend_(limit);
  var trendSlice = null;
  if (!cachedTrend) {
    trendSlice = index.list.slice(0, limit);
    for (var t = 0; t < trendSlice.length; t++) {
      pushRow(index.idToRow[trendSlice[t].id]);
    }
  }

  var rawRows = readArchiveReportRows_(sheet, rowNums);
  var parsedByRow = {};
  for (var j = 0; j < rowNums.length; j++) {
    parsedByRow[rowNums[j]] = parseArchiveReportRow_(rawRows[j]);
  }

  var previousRaw = null;
  if (prevId != null && index.idToRow[prevId]) {
    previousRaw = parsedByRow[index.idToRow[prevId]] || null;
  }

  var weeksTrend = cachedTrend;
  if (!weeksTrend && trendSlice) {
    weeksTrend = buildWeeklyTrendFromParsed_(index, trendSlice, parsedByRow);
    putCachedWeeklyTrend_(limit, weeksTrend);
  }

  return {
    report: parsedByRow[targetRow],
    previousRaw: previousRaw,
    weeksTrend: weeksTrend || [],
  };
}

/**
 * Один запрос при открытии Viewer: список + отчёт + slim previous + weeksTrend.
 * Индекс и строки таблицы читаются batch-ом; ответ кэшируется.
 */
function getArchiveBootstrap(requestedId) {
  var sheet = getArchiveSheet_();
  if (!sheet) {
    return { list: [], report: null, previous: null, reportId: null };
  }

  var index = getArchiveIndex_(sheet);

  if (!index.list.length) {
    return { list: [], report: null, previous: null, reportId: null };
  }

  var targetId = requestedId ? Number(requestedId) : index.list[0].id;
  if (isNaN(targetId) || !index.idToRow[targetId]) {
    targetId = index.list[0].id;
  }

  var cached = getCachedBootstrap_(targetId);
  if (cached) return cached;

  var bundle = loadBootstrapPayload_(sheet, index, targetId, 5);
  var result = assembleBootstrapResponse_(index, targetId, bundle.report, bundle.previousRaw);
  result.weeksTrend = bundle.weeksTrend;
  putCachedBootstrap_(targetId, result);
  return result;
}

function getDynamicsWeekMonSun_(anchor) {
  var week = getCalendarWeekMonSun_(anchor);
  if (!week) return null;
  var monday = new Date(week.monday);
  monday.setDate(monday.getDate() - 7);
  var sunday = new Date(week.sunday);
  sunday.setDate(sunday.getDate() - 7);

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }
  function iso(dt) {
    return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
  }
  function ddmm(dt) {
    return pad(dt.getDate()) + '.' + pad(dt.getMonth() + 1);
  }

  return {
    start: iso(monday),
    end: iso(sunday),
    period: ddmm(monday) + '-' + ddmm(sunday),
    monday: monday,
    sunday: sunday,
  };
}

function getCalendarWeekMonSun_(anchor) {
  var d;
  if (anchor instanceof Date) {
    d = new Date(anchor.getTime());
  } else {
    var s = String(anchor || '').trim();
    var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
    if (m) {
      d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    } else {
      d = new Date(s);
    }
  }
  if (!d || isNaN(d.getTime())) return null;

  var day = d.getDay();
  var daysToMonday = day === 0 ? 6 : day - 1;
  var monday = new Date(d);
  monday.setDate(d.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  var sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }
  function iso(dt) {
    return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
  }
  function ddmm(dt) {
    return pad(dt.getDate()) + '.' + pad(dt.getMonth() + 1);
  }

  return {
    start: iso(monday),
    end: iso(sunday),
    period: ddmm(monday) + '-' + ddmm(sunday),
    monday: monday,
    sunday: sunday,
  };
}

function sumArchiveDynamics_(mosData) {
  if (!mosData || !mosData.length) return 0;
  var total = 0;
  for (var i = 0; i < mosData.length; i++) {
    var r = mosData[i];
    var g =
      r.growth != null
        ? r.growth
        : r['Динамика с прошлой недели'] != null
          ? r['Динамика с прошлой недели']
          : r['Динамика'];
    total += toNumArchive_(g);
  }
  return total;
}

var WEEKLY_TREND_CACHE_TTL = 300;

function getCachedWeeklyTrend_(limit) {
  try {
    var key = 'knsk_trend_v2_' + getArchiveDataVersion_() + '_' + limit;
    var cached = CacheService.getScriptCache().get(key);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.warn('archive: trend cache read', e && e.message);
  }
  return null;
}

function putCachedWeeklyTrend_(limit, data) {
  try {
    var key = 'knsk_trend_v2_' + getArchiveDataVersion_() + '_' + limit;
    CacheService.getScriptCache().put(key, JSON.stringify(data), WEEKLY_TREND_CACHE_TTL);
  } catch (e) {
    console.warn('archive: trend cache write', e && e.message);
  }
}

function getWeeklyDynamicsTrend_(sheet, index, weekLimit) {
  var limit = weekLimit ? Math.min(Math.max(1, Number(weekLimit)), 24) : 5;
  if (!index || !index.list || !index.list.length) return [];

  var slice = index.list.slice(0, limit);
  var pairs = [];
  var i;

  for (i = 0; i < slice.length; i++) {
    var item = slice[i];
    var rowNum = index.idToRow[item.id];
    if (!rowNum) continue;
    pairs.push({ item: item, rowNum: rowNum });
  }
  if (!pairs.length) return [];

  var rowNums = pairs.map(function (p) {
    return p.rowNum;
  });
  var rows = readArchiveReportRows_(sheet, rowNums);
  var weeks = [];

  for (i = pairs.length - 1; i >= 0; i--) {
    var report = parseArchiveReportRow_(rows[i]);
    var pairItem = pairs[i].item;
    var range = getDynamicsWeekMonSun_(report.timestamp || pairItem.dateStr || '');
    if (!range) continue;
    weeks.push({
      start: range.start,
      end: range.end,
      value: sumArchiveDynamics_(report.mosData || []),
      reportId: pairItem.id,
    });
  }

  return weeks;
}

function getWeeklyDynamicsTrendCached_(sheet, index, weekLimit) {
  var limit = weekLimit ? Math.min(Math.max(1, Number(weekLimit)), 24) : 5;
  var cached = getCachedWeeklyTrend_(limit);
  if (cached) return cached;
  var result = getWeeklyDynamicsTrend_(sheet, index, limit);
  putCachedWeeklyTrend_(limit, result);
  return result;
}

/** Точки графика «Динамика КнСК»: сумма столбца Динамика по МО, неделя Пн–Вс */
function getWeeklyDynamicsTrend(weekLimit) {
  try {
    var sheet = getArchiveSheet_();
    if (!sheet) return [];
    var index = getArchiveIndex_(sheet);
    return getWeeklyDynamicsTrendCached_(sheet, index, weekLimit);
  } catch (error) {
    console.error('Ошибка расчёта недельной динамики:', error);
    return [];
  }
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
  var index = getArchiveIndex_(sheet);
  var payload = getArchivedReportWithPreviousFromIndex_(sheet, index, id);
  payload.weeksTrend = getWeeklyDynamicsTrendCached_(sheet, index, 5);
  return payload;
}

function getArchivedReportById(id) {
  try {
    var sheet = getArchiveSheet_();
    if (!sheet) throw new Error('Лист Архив не найден');

    var numId = Number(id);
    if (isNaN(numId)) throw new Error('Некорректный ID отчёта');

    var index = getArchiveIndex_(sheet);
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

  var index = getArchiveIndex_(sheet);
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
    slimReportForBootstrap_,
    assembleBootstrapResponse_,
    buildWeeklyTrendFromParsed_,
  };
}
