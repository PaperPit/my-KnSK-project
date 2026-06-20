/**
 * perfTracker.js — метки времени и журнал GAS-вызовов для диагностики производительности
 */

import { getWeeksTrendCache } from '../lib/weeksTrendCache.js';

const MAX_MARKS = 80;
const MAX_GAS = 50;

const marks = [];
const gasCalls = [];
let originMs = null;

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function ensureOrigin() {
  if (originMs == null) originMs = now();
}

export function perfMark(name, detail) {
  ensureOrigin();
  const entry = { name, t: now(), detail: detail || '' };
  marks.push(entry);
  if (marks.length > MAX_MARKS) marks.shift();
  if (typeof performance !== 'undefined') {
    try {
      performance.mark('knsk:' + name);
    } catch (_e) {}
  }
  return entry;
}

export function estimatePayloadBytes(value) {
  if (value == null) return 0;
  if (typeof value === 'string') return value.length;
  try {
    if (typeof Blob !== 'undefined') {
      return new Blob([JSON.stringify(value)]).size;
    }
    return JSON.stringify(value).length;
  } catch (_e) {
    return String(value).length;
  }
}

export function recordGasCall(functionName, durationMs, payloadBytes, ok) {
  ensureOrigin();
  gasCalls.push({
    functionName,
    durationMs: Math.round(durationMs),
    payloadBytes: payloadBytes || 0,
    ok: ok !== false,
    at: now(),
  });
  if (gasCalls.length > MAX_GAS) gasCalls.shift();
}

export function getMarks() {
  return marks.slice();
}

export function getGasCalls() {
  return gasCalls.slice();
}

export function resetPerfSession() {
  marks.length = 0;
  gasCalls.length = 0;
  originMs = now();
}

function formatKb(bytes) {
  if (!bytes) return '0 KB';
  return (bytes / 1024).toFixed(1) + ' KB';
}

function navigationSummary() {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) return null;
  const nav = performance.getEntriesByType('navigation')[0];
  if (!nav) return null;
  return {
    domInteractive: Math.round(nav.domInteractive),
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
    loadEvent: Math.round(nav.loadEventEnd),
    transferSize: nav.transferSize || 0,
  };
}

function scriptFootprintEstimate() {
  if (typeof document === 'undefined') return { inlineChars: 0, scriptTags: 0 };
  let inlineChars = 0;
  let scriptTags = 0;
  document.querySelectorAll('script').forEach(function (el) {
    scriptTags += 1;
    if (el.src) return;
    inlineChars += (el.textContent || '').length;
  });
  return { inlineChars, scriptTags };
}

function cacheSummary(root) {
  const out = [];
  try {
    if (root.localStorage && root.localStorage.getItem('knsk_viewer_report_v1')) {
      const raw = root.localStorage.getItem('knsk_viewer_report_v1');
      out.push('viewer localStorage: ' + formatKb(raw ? raw.length : 0));
    } else {
      out.push('viewer localStorage: нет');
    }
  } catch (_e) {
    out.push('viewer localStorage: недоступен');
  }
  const weeks = getWeeksTrendCache();
  out.push(
    weeks && weeks.length
      ? 'weeksTrend client cache: ' + weeks.length + ' точек'
      : 'weeksTrend client cache: нет'
  );
  return out;
}

function marksTable(origin) {
  if (!marks.length) return ['(меток пока нет — обновите страницу и загрузите отчёт)'];
  const lines = [];
  let prev = origin;
  marks.forEach(function (m) {
    const delta = Math.round(m.t - prev);
    const fromStart = Math.round(m.t - origin);
    lines.push(
      `  +${String(delta).padStart(5)} ms  @${String(fromStart).padStart(6)} ms  ${m.name}${m.detail ? ' — ' + m.detail : ''}`
    );
    prev = m.t;
  });
  return lines;
}

function gasTable() {
  if (!gasCalls.length) return ['(GAS-вызовов в журнале нет)'];
  const sorted = gasCalls.slice().sort(function (a, b) {
    return b.durationMs - a.durationMs;
  });
  const totalMs = gasCalls.reduce(function (s, c) {
    return s + c.durationMs;
  }, 0);
  const totalBytes = gasCalls.reduce(function (s, c) {
    return s + c.payloadBytes;
  }, 0);
  const lines = [
    `  всего вызовов: ${gasCalls.length}, суммарно ${totalMs} ms, ~${formatKb(totalBytes)} ответов`,
    '',
  ];
  sorted.forEach(function (c) {
    lines.push(
      `  ${String(c.durationMs).padStart(5)} ms  ${formatKb(c.payloadBytes).padStart(8)}  ${c.ok ? 'OK' : 'ERR'}  ${c.functionName}`
    );
  });
  return lines;
}

/**
 * @param {import('./GoogleAppsScriptAdapter.js').GoogleAppsScriptAdapter | null} gasAdapter
 */
export async function runPerformanceReport(gasAdapter) {
  ensureOrigin();
  const root = typeof globalThis !== 'undefined' ? globalThis : {};
  const lines = [];
  const t0 = now();

  lines.push('=== KnSK Performance Report ===');
  lines.push('Время: ' + new Date().toISOString());
  lines.push('URL: ' + (typeof location !== 'undefined' ? location.href : 'n/a'));
  lines.push('Режим: ' + (root.document && root.document.body && root.document.body.classList.contains('viewer-mode') ? 'viewer' : 'editor'));
  lines.push('');

  const nav = navigationSummary();
  if (nav) {
    lines.push('--- Навигация (PerformanceNavigationTiming) ---');
    lines.push('  DOM interactive:      ' + nav.domInteractive + ' ms');
    lines.push('  DOMContentLoaded end: ' + nav.domContentLoaded + ' ms');
    lines.push('  Load event end:       ' + nav.loadEvent + ' ms');
    if (nav.transferSize) lines.push('  transferSize:         ' + formatKb(nav.transferSize));
    lines.push('');
  }

  const scripts = scriptFootprintEstimate();
  lines.push('--- Синхронный JS на странице ---');
  lines.push('  <script> тегов: ' + scripts.scriptTags);
  lines.push('  inline JS:       ~' + formatKb(scripts.inlineChars));
  lines.push('  Chart.js:        ' + (typeof root.Chart !== 'undefined' ? 'загружен (sync)' : 'нет'));
  lines.push('  DataLabels:      ' + (typeof root.ChartDataLabels !== 'undefined' ? 'загружен (sync)' : 'нет'));
  lines.push('  DashboardPhase2: ' + (root.DashboardPhase2 ? 'да' : 'lazy'));
  lines.push('');

  lines.push('--- Кэш ---');
  cacheSummary(root).forEach(function (l) {
    lines.push('  ' + l);
  });
  lines.push('');

  lines.push('--- Метки сессии (от старта perfTracker) ---');
  marksTable(originMs).forEach(function (l) {
    lines.push(l);
  });
  lines.push('');

  lines.push('--- GAS google.script.run (журнал адаптера) ---');
  gasTable().forEach(function (l) {
    lines.push(l);
  });
  lines.push('');

  if (gasAdapter && gasAdapter.originalRun) {
    lines.push('--- Живой замер (1 запрос) ---');
    const probes = [];
    if (root.document && root.document.body && root.document.body.classList.contains('viewer-mode')) {
      probes.push(['getArchivedReportsList', []]);
    } else {
      probes.push(['getArchivedReportsList', []]);
    }
    for (let i = 0; i < probes.length; i++) {
      const fn = probes[i][0];
      const params = probes[i][1];
      const start = now();
      try {
        const result = await gasAdapter.call(fn, { params: params });
        const ms = Math.round(now() - start);
        const bytes = estimatePayloadBytes(result);
        lines.push(`  ${fn}: ${ms} ms, ~${formatKb(bytes)}`);
      } catch (err) {
        lines.push(`  ${fn}: ERR — ${err && err.message ? err.message : String(err)}`);
      }
    }
    lines.push('');
  }

  const gasTotal = gasCalls.reduce(function (s, c) {
    return s + c.durationMs;
  }, 0);
  const lastMark = marks.length ? marks[marks.length - 1] : null;
  const sessionMs = lastMark ? Math.round(lastMark.t - originMs) : 0;

  lines.push('--- Вывод для оптимизации ---');
  if (gasTotal > sessionMs * 0.5 && gasTotal > 300) {
    lines.push('  • GAS round-trip — главный узкий участок (~' + gasTotal + ' ms в журнале).');
    lines.push('    → объединять bootstrap, slim payload, кэш на сервере.');
  }
  if (scripts.inlineChars > 250000) {
    lines.push('  • Крупный inline JS (~' + formatKb(scripts.inlineChars) + ') — парсинг блокирует main thread.');
    lines.push('    → ленивый Chart.js / Phase1 split (с sync fallback).');
  }
  if (typeof root.Chart !== 'undefined' && scripts.inlineChars > 150000) {
    lines.push('  • Chart.js в sync HTML — надёжно, но ~200 KB к критическому пути.');
  }
  if (!marks.some(function (m) {
    return m.name === 'charts-painted';
  })) {
    lines.push('  • Метка charts-painted отсутствует — загрузите отчёт до замера.');
  }
  lines.push('');
  lines.push('Сбор отчёта: ' + Math.round(now() - t0) + ' ms');

  return {
    text: lines.join('\n'),
    gasTotalMs: gasTotal,
    sessionMs: sessionMs,
    inlineJsBytes: scripts.inlineChars,
  };
}

const api = {
  perfMark,
  estimatePayloadBytes,
  recordGasCall,
  getMarks,
  getGasCalls,
  resetPerfSession,
  runPerformanceReport,
};

if (typeof globalThis !== 'undefined') {
  globalThis.KnSKPerf = api;
}

export default api;
