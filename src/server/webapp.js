/**
 * =============================================================================
 * webapp.js — точка входа веб-приложения (сервер Google Apps Script)
 * =============================================================================
 *
 * НЕ РЕДАКТИРОВАТЬ Code.js в корне — он генерируется из src/server/* командой
 * npm run build.
 *
 * Публичные функции (вызываются из браузера или GAS):
 *   doGet(e)           — открытие Index (редактор) или Viewer (?viewer=1)
 *   include(filename)  — подключение HTML-фрагментов в шаблонах
 *   getCurrentData()   — чтение листа «Данные» (вспомогательно)
 *
 * URL-параметры:
 *   ?viewer=1          — режим только чтения (Viewer.html)
 *   ?viewer=1&id=5     — сразу открыть отчёт архива с ID=5
 *
 * ПОСЛЕ ПРАВОК: npm run build → clasp push → новая версия развёртывания
 * =============================================================================
 */

/** Актуальный URL развёртывания (для кнопки «Веб-версия» в редакторе) */
function getWebAppUrl() {
  try {
    return ScriptApp.getService().getUrl() || '';
  } catch (_e) {
    return '';
  }
}

/**
 * =============================================================================
 * Настраиваемые пороги сигналов (Ф10) — PropertiesService
 * =============================================================================
 * Администратор меняет значения в окне «Настройки» редактора; сохранённые
 * значения перекрывают константы config.js при формировании clientConfigJson.
 */
var SIGNAL_SETTINGS_PROP_KEY = 'knsk_signal_settings_v1';

var SIGNAL_SETTINGS_FIELDS = {
  planYear: { min: 1, max: 100000000 },
  planWeekly: { min: 1, max: 10000000 },
  planThreshold: { min: 1, max: 100 },
  coverageLowThreshold: { min: 1, max: 100 },
  coverageTarget: { min: 1, max: 100 },
};

/** Валидация настроек: только известные ключи, числа в допустимых пределах. */
function sanitizeSignalSettings_(input) {
  var out = {};
  if (!input || typeof input !== 'object') return out;
  Object.keys(SIGNAL_SETTINGS_FIELDS).forEach(function (key) {
    var bounds = SIGNAL_SETTINGS_FIELDS[key];
    var num = Number(input[key]);
    if (isFinite(num) && num >= bounds.min && num <= bounds.max) {
      out[key] = Math.round(num);
    }
  });
  return out;
}

function getSavedSignalSettings_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(SIGNAL_SETTINGS_PROP_KEY);
    return raw ? sanitizeSignalSettings_(JSON.parse(raw)) : {};
  } catch (e) {
    console.warn('settings: чтение не удалось', e && e.message);
    return {};
  }
}

/** Сохранить пользовательские пороги (вызывается из окна «Настройки»). */
function saveSignalSettings(settings) {
  var clean = sanitizeSignalSettings_(settings);
  PropertiesService.getScriptProperties().setProperty(
    SIGNAL_SETTINGS_PROP_KEY,
    JSON.stringify(clean)
  );
  return { message: '✅ Настройки сохранены', settings: clean };
}

/** Сбросить пороги к значениям config.js. */
function resetSignalSettings() {
  PropertiesService.getScriptProperties().deleteProperty(SIGNAL_SETTINGS_PROP_KEY);
  return { message: '✅ Настройки сброшены к значениям по умолчанию' };
}

/**
 * Настройки для браузера: планы, CDN, API, webAppUrl.
 * Подставляется в Index.html / Viewer.html как <?!= clientConfigJson ?>
 */
function getClientConfigJson() {
  var saved = getSavedSignalSettings_();
  var defaultsPlans = CONFIG.plans || {};
  return JSON.stringify({
    plans: {
      year: saved.planYear || PLAN_YEAR,
      weekly: saved.planWeekly || PLAN_WEEKLY,
      threshold: saved.planThreshold || PLAN_THRESHOLD,
      coverageLow: saved.coverageLowThreshold || defaultsPlans.coverageLowThreshold || 50,
      coverageTarget: saved.coverageTarget || defaultsPlans.coverageTarget || 70,
    },
    signalSettingsSource: Object.keys(saved).length ? 'custom' : 'default',
    api: CONFIG.api,
    csv: CONFIG.csv,
    table: CONFIG.table,
    backup: CONFIG.backup,
    logging: CONFIG.logging,
    ui: CONFIG.ui,
    dev: CONFIG.dev,
    webAppUrl: getWebAppUrl(),
  });
}

/**
 * Обработчик GET при открытии URL веб-приложения.
 * @param {Object} e — event с e.parameter.viewer, e.parameter.id
 */
function doGet(e) {
  const clientConfigJson = getClientConfigJson();
  const webAppUrl = getWebAppUrl();

  if (e && e.parameter && e.parameter.viewer === '1') {
    const template = HtmlService.createTemplateFromFile('Viewer');
    template.reportId = e.parameter.id || null;
    template.clientConfigJson = clientConfigJson;
    template.webAppUrl = webAppUrl;
    return template
      .evaluate()
      .setTitle('Просмотр отчёта Онкоскрининг')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  const template = HtmlService.createTemplateFromFile('Index');
  template.clientConfigJson = clientConfigJson;
  template.webAppUrl = webAppUrl;
  return template
    .evaluate()
    .setTitle('Онкоскрининг — Редактор')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Вставка содержимого HTML-файла проекта (DashboardPhase1, LibBundle, …) */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** Разрешённые ленивые клиентские бандлы (имя HTML-файла без расширения). */
var CLIENT_BUNDLE_ALLOWLIST = {
  VendorChartJs: true,
  DashboardPhase2: true,
  MoProfile: true,
  VendorChartDataLabels: true,
  VendorEcharts: true,
};

/**
 * Ленивая подгрузка JS-бандла с сервера (без внешних CDN).
 * @param {string} name — имя файла: DashboardPhase2, MoProfile, …
 * @returns {string} чистый JS-код
 */
function getClientBundle(name) {
  if (!name || !CLIENT_BUNDLE_ALLOWLIST[name]) {
    throw new Error('Неизвестный клиентский бандл: ' + name);
  }
  var raw = HtmlService.createHtmlOutputFromFile(name).getContent();
  return raw.replace(/^<script>\s*/i, '').replace(/\s*<\/script>\s*$/i, '');
}

/** Чтение листа «Данные» как массив объектов {заголовок: значение} */
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

  const headers = values[0].map((h) => String(h).trim());
  const rows = values.slice(1).filter((row) => row.some((cell) => cell !== null && cell !== ''));

  return rows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] != null ? String(row[i]) : '';
    });
    return obj;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sanitizeSignalSettings_,
  };
}
