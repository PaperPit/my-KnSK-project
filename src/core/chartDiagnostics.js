/**
 * chartDiagnostics.js — диагностика Chart.js и производительности (GAS)
 */

import { runPerformanceReport } from './perfTracker.js';

function g() {
  return typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {};
}

function stamp() {
  return new Date().toISOString().slice(11, 23);
}

function createReporter() {
  const lines = [];
  const tests = [];

  function push(level, message) {
    lines.push(`[${stamp()}] [${level}] ${message}`);
  }

  function record(name, ok, detail) {
    tests.push({ name, ok, detail: detail || '' });
    push(ok ? 'PASS' : 'FAIL', `${name}${detail ? ' — ' + detail : ''}`);
  }

  function warn(message) {
    push('WARN', message);
  }

  function info(message) {
    push('INFO', message);
  }

  return { lines, tests, record, warn, info, push };
}

function canvasSnapshot(id) {
  if (typeof document === 'undefined') return { exists: false };
  const el = document.getElementById(id);
  if (!el) return { exists: false };
  const rect = el.getBoundingClientRect();
  return {
    exists: true,
    width: rect.width,
    height: rect.height,
    offsetWidth: el.offsetWidth,
    offsetHeight: el.offsetHeight,
    parentHidden: el.closest('[hidden]') != null,
  };
}

function loadScriptUrl(url, globalName) {
  return new Promise(function (resolve, reject) {
    const root = g();
    if (globalName && typeof root[globalName] !== 'undefined') {
      resolve('already-loaded');
      return;
    }
    if (typeof document === 'undefined') {
      reject(new Error('document недоступен'));
      return;
    }
    const el = document.createElement('script');
    el.src = url;
    el.async = true;
    el.onload = function () {
      if (globalName && typeof root[globalName] === 'undefined') {
        reject(new Error('Скрипт загружен, но window.' + globalName + ' не определён'));
        return;
      }
      resolve('loaded');
    };
    el.onerror = function () {
      reject(new Error('Не удалось загрузить ' + url));
    };
    document.head.appendChild(el);
  });
}

async function tryRenderProbeChart() {
  const root = g();
  if (typeof document === 'undefined' || typeof root.Chart === 'undefined') {
    return false;
  }
  let canvas = document.getElementById('knskDiagProbeChart');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'knskDiagProbeChart';
    canvas.width = 120;
    canvas.height = 80;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;left:-9999px;width:120px;height:80px;';
    document.body.appendChild(canvas);
  }
  const chart = new root.Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels: ['A'], datasets: [{ data: [42], backgroundColor: '#2c7da0' }] },
    options: { animation: false, plugins: { legend: { display: false }, datalabels: { display: false } } },
  });
  const ok = chart && chart.data.datasets[0].data[0] === 42;
  chart.destroy();
  return ok;
}

/**
 * @param {import('./GoogleAppsScriptAdapter.js').GoogleAppsScriptAdapter | null} gasAdapter
 */
export async function runChartDiagnostics(gasAdapter) {
  const r = createReporter();
  const t0 = performance.now();

  const root = g();
  const cfg = root.CONFIG;

  r.info('KnSK Chart Diagnostics v1');
  r.info('URL: ' + (typeof location !== 'undefined' ? location.href : 'n/a'));
  r.info('User-Agent: ' + (typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a'));

  r.record('CONFIG', typeof cfg !== 'undefined', cfg ? 'plans.weekly=' + cfg.plans.weekly : '');
  r.record(
    'google.script.run',
    !!(root.google && root.google.script && root.google.script.run)
  );
  r.record('KnSKBundleLoader', !!root.KnSKBundleLoader);
  r.record('DashboardPhase1', !!root.DashboardPhase1);
  r.record('DashboardPhase2', !!root.DashboardPhase2);

  const chartBefore = typeof root.Chart !== 'undefined';
  r.record('Chart.js (до загрузки)', chartBefore, chartBefore ? 'уже в window' : 'не найден');

  const dataLabelsBefore = typeof root.ChartDataLabels !== 'undefined';
  r.record('ChartDataLabels (до загрузки)', dataLabelsBefore, dataLabelsBefore ? 'уже в window' : 'не найден');

  const canvases = [
    'top5PlanChart',
    'bottom5PlanChart',
    'top5CoverageChart',
    'bottom5CoverageChart',
    'coverageChart',
    'trendChart',
    'planFactChart',
  ];
  canvases.forEach(function (id) {
    const snap = canvasSnapshot(id);
    r.record(
      'canvas #' + id,
      snap.exists,
      snap.exists
        ? `size ${snap.width.toFixed(0)}×${snap.height.toFixed(0)}px` +
            (snap.parentHidden ? ' (родитель hidden)' : '')
        : 'элемент не найден'
    );
  });

  if (chartBefore && dataLabelsBefore) {
    r.record('getClientBundle(VendorChartJs)', true, 'skip — sync в HTML');
    r.record('getClientBundle(VendorChartDataLabels)', true, 'skip — sync в HTML');
    if (root.KnSKBundleLoader && typeof root.KnSKBundleLoader.registerChartDataLabels === 'function') {
      root.KnSKBundleLoader.registerChartDataLabels();
    }
  } else if (gasAdapter && gasAdapter.originalRun) {
    for (const bundleName of ['VendorChartJs', 'VendorChartDataLabels']) {
      try {
        const code = await gasAdapter.call('getClientBundle', { params: [bundleName] });
        const len = code ? code.length : 0;
        const head = code ? code.slice(0, 80).replace(/\s+/g, ' ') : '';
        r.record(
          'getClientBundle(' + bundleName + ')',
          len > 1000,
          'bytes=' + len + (head ? '; head="' + head + '…"' : '')
        );
      } catch (err) {
        r.record('getClientBundle(' + bundleName + ')', false, err && err.message ? err.message : String(err));
      }
    }
  } else {
    r.record('getClientBundle', false, 'GAS API недоступен (gasAdapter.originalRun=null)');
  }

  if (!chartBefore && root.KnSKBundleLoader && typeof root.KnSKBundleLoader.ensureChartJs === 'function') {
    try {
      const t1 = performance.now();
      await root.KnSKBundleLoader.ensureChartJs();
      r.record('ensureChartJs()', typeof root.Chart !== 'undefined', (performance.now() - t1).toFixed(0) + ' ms');
    } catch (err) {
      r.record('ensureChartJs()', false, err && err.message ? err.message : String(err));
      r.warn('Пробую CDN fallback для Chart.js…');
      try {
        await loadScriptUrl(
          'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
          'Chart'
        );
        r.record('CDN Chart.js', typeof root.Chart !== 'undefined', 'jsdelivr');
      } catch (cdnErr) {
        r.record('CDN Chart.js', false, cdnErr && cdnErr.message ? cdnErr.message : String(cdnErr));
      }
    }
  }

  if (typeof root.Chart !== 'undefined' && typeof root.ChartDataLabels === 'undefined' && root.KnSKBundleLoader) {
    try {
      await root.KnSKBundleLoader.ensureChartDataLabels();
      r.record('ensureChartDataLabels()', typeof root.ChartDataLabels !== 'undefined', '');
    } catch (err) {
      r.record('ensureChartDataLabels()', false, err && err.message ? err.message : String(err));
      try {
        await loadScriptUrl(
          'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2',
          'ChartDataLabels'
        );
        if (typeof root.Chart !== 'undefined' && typeof root.ChartDataLabels !== 'undefined') {
          root.Chart.register(root.ChartDataLabels);
        }
        r.record('CDN DataLabels', typeof root.ChartDataLabels !== 'undefined', 'jsdelivr');
      } catch (cdnErr) {
        r.record('CDN DataLabels', false, cdnErr && cdnErr.message ? cdnErr.message : String(cdnErr));
      }
    }
  }

  if (chartBefore && dataLabelsBefore) {
    r.record('ensureChartsReadyBundle()', true, 'skip — уже sync');
  } else if (root.KnSKBundleLoader && typeof root.KnSKBundleLoader.ensureChartsReadyBundle === 'function') {
    try {
      await root.KnSKBundleLoader.ensureChartsReadyBundle();
      r.record('ensureChartsReadyBundle()', true, '');
    } catch (err) {
      r.record('ensureChartsReadyBundle()', false, err && err.message ? err.message : String(err));
    }
  }

  r.record('Chart.js (итог)', typeof root.Chart !== 'undefined', chartBefore ? 'sync' : 'lazy/cdn');
  r.record('ChartDataLabels (итог)', typeof root.ChartDataLabels !== 'undefined', '');

  if (typeof root.Chart !== 'undefined') {
    try {
      const probeOk = await tryRenderProbeChart();
      r.record('Тестовый график (probe)', probeOk, '');
    } catch (err) {
      r.record('Тестовый график (probe)', false, err && err.message ? err.message : String(err));
    }
  }

  if (root.DashboardPhase1 && typeof root.Chart !== 'undefined') {
    try {
      if (typeof root.DashboardPhase1.destroyRankCharts === 'function') {
        root.DashboardPhase1.destroyRankCharts();
      }
      const mockMos = [
        { name: 'Тест МО 1', plan: 1000, fact: 900, percent: 90, growth: 10, colon: 5, hasDev: 10, noDev: 0, zno: 1 },
        { name: 'Тест МО 2', plan: 1000, fact: 800, percent: 80, growth: 8, colon: 4, hasDev: 8, noDev: 0, zno: 0 },
        { name: 'Тест МО 3', plan: 1000, fact: 700, percent: 70, growth: 7, colon: 3, hasDev: 7, noDev: 0, zno: 0 },
        { name: 'Тест МО 4', plan: 1000, fact: 600, percent: 60, growth: 6, colon: 2, hasDev: 6, noDev: 0, zno: 0 },
        { name: 'Тест МО 5', plan: 1000, fact: 500, percent: 50, growth: 5, colon: 1, hasDev: 5, noDev: 0, zno: 0 },
      ];
      root.DashboardPhase1.renderRankCharts(mockMos);
      r.record('DashboardPhase1.renderRankCharts', true, 'вызван с тестовыми данными');
    } catch (err) {
      r.record('DashboardPhase1.renderRankCharts', false, err && err.message ? err.message : String(err));
    }
  }

  const passed = r.tests.filter((t) => t.ok).length;
  const failed = r.tests.filter((t) => !t.ok).length;
  const elapsed = (performance.now() - t0).toFixed(0);

  r.info('---');
  r.info(`Итого: ${passed} OK, ${failed} FAIL, ${elapsed} ms`);
  if (failed > 0) {
    r.warn('Скопируйте лог ниже и отправьте разработчику.');
    if (!chartBefore && failed > 0) {
      r.warn('Вероятная причина: Chart.js не загрузился (getClientBundle или инъекция скрипта).');
    }
  }

  return {
    text: r.lines.join('\n'),
    passed,
    failed,
    tests: r.tests,
    elapsedMs: Number(elapsed),
  };
}

function ensureDiagnosticsPanel() {
  let panel = document.getElementById('knskDiagPanel');
  if (panel) return panel;

  panel = document.createElement('div');
  panel.id = 'knskDiagPanel';
  panel.className = 'knsk-diag-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'knskDiagTitle');
  panel.hidden = true;
  panel.innerHTML =
    '<div class="knsk-diag-panel__shell">' +
    '<div class="knsk-diag-panel__head">' +
    '<h2 id="knskDiagTitle">Диагностика KnSK</h2>' +
    '<button type="button" class="knsk-diag-panel__close" id="knskDiagClose" aria-label="Закрыть">&times;</button>' +
    '</div>' +
    '<div class="knsk-diag-tabs" role="tablist" aria-label="Разделы диагностики">' +
    '<button type="button" class="knsk-diag-tab knsk-diag-tab--active" role="tab" id="knskDiagTabTests" data-diag-tab="tests" aria-selected="true" aria-controls="knskDiagPanelTests">Тесты графиков</button>' +
    '<button type="button" class="knsk-diag-tab" role="tab" id="knskDiagTabPerf" data-diag-tab="perf" aria-selected="false" aria-controls="knskDiagPanelPerf">Производительность</button>' +
    '</div>' +
    '<div id="knskDiagPanelTests" class="knsk-diag-tab-panel" role="tabpanel" aria-labelledby="knskDiagTabTests">' +
    '<p class="knsk-diag-panel__hint">Проверка Chart.js, canvas и отрисовки. Скопируйте лог при ошибках.</p>' +
    '<div class="knsk-diag-panel__actions">' +
    '<button type="button" class="knsk-diag-btn knsk-diag-btn--primary" id="knskDiagRunTests">Запустить тесты</button>' +
    '</div>' +
    '</div>' +
    '<div id="knskDiagPanelPerf" class="knsk-diag-tab-panel" role="tabpanel" aria-labelledby="knskDiagTabPerf" hidden>' +
    '<p class="knsk-diag-panel__hint">Метки загрузки, журнал GAS и размеры payload. Лучше открыть после загрузки отчёта.</p>' +
    '<div class="knsk-diag-panel__actions">' +
    '<button type="button" class="knsk-diag-btn knsk-diag-btn--primary" id="knskDiagRunPerf">Собрать отчёт</button>' +
    '</div>' +
    '</div>' +
    '<div class="knsk-diag-panel__actions knsk-diag-panel__actions--footer">' +
    '<button type="button" class="knsk-diag-btn" id="knskDiagCopy">Скопировать лог</button>' +
    '</div>' +
    '<pre class="knsk-diag-log" id="knskDiagLog" aria-live="polite">Выберите вкладку и нажмите «Запустить»…</pre>' +
    '</div>';

  document.body.appendChild(panel);
  panel.querySelector('#knskDiagClose').addEventListener('click', function () {
    panel.hidden = true;
  });
  return panel;
}

function switchDiagTab(panel, tabId) {
  panel.querySelectorAll('[data-diag-tab]').forEach(function (btn) {
    const active = btn.getAttribute('data-diag-tab') === tabId;
    btn.classList.toggle('knsk-diag-tab--active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  const testsPanel = panel.querySelector('#knskDiagPanelTests');
  const perfPanel = panel.querySelector('#knskDiagPanelPerf');
  if (testsPanel) testsPanel.hidden = tabId !== 'tests';
  if (perfPanel) perfPanel.hidden = tabId !== 'perf';
  panel.setAttribute('data-active-tab', tabId);
}

/**
 * @param {{ gasAdapter?: object, onStatus?: (msg: string, ok?: boolean) => void }} opts
 */
export function openChartDiagnostics(opts) {
  const options = opts || {};
  const panel = ensureDiagnosticsPanel();
  const logEl = panel.querySelector('#knskDiagLog');
  const runTestsBtn = panel.querySelector('#knskDiagRunTests');
  const runPerfBtn = panel.querySelector('#knskDiagRunPerf');
  const copyBtn = panel.querySelector('#knskDiagCopy');

  panel.hidden = false;
  let lastText = '';
  let activeTab = 'tests';

  panel.querySelectorAll('[data-diag-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeTab = btn.getAttribute('data-diag-tab');
      switchDiagTab(panel, activeTab);
      logEl.textContent =
        activeTab === 'perf'
          ? 'Нажмите «Собрать отчёт» для анализа производительности…'
          : 'Нажмите «Запустить тесты»…';
    });
  });

  switchDiagTab(panel, 'tests');

  async function runTests() {
    activeTab = 'tests';
    switchDiagTab(panel, 'tests');
    runTestsBtn.disabled = true;
    logEl.textContent = 'Выполняю тесты…';
    try {
      const result = await runChartDiagnostics(options.gasAdapter || null);
      lastText = result.text;
      logEl.textContent = lastText;
      if (options.onStatus) {
        options.onStatus(
          result.failed
            ? 'Диагностика: ' + result.failed + ' ошибок — скопируйте лог'
            : 'Тесты: ' + result.passed + ' OK',
          result.failed === 0
        );
      }
    } catch (err) {
      lastText = 'Критическая ошибка: ' + (err && err.message ? err.message : String(err));
      logEl.textContent = lastText;
      if (options.onStatus) options.onStatus(lastText, false);
    } finally {
      runTestsBtn.disabled = false;
    }
  }

  async function runPerf() {
    activeTab = 'perf';
    switchDiagTab(panel, activeTab);
    runPerfBtn.disabled = true;
    logEl.textContent = 'Собираю отчёт производительности…';
    try {
      const result = await runPerformanceReport(options.gasAdapter || null);
      lastText = result.text;
      logEl.textContent = lastText;
      if (options.onStatus) {
        options.onStatus('Performance: GAS ~' + result.gasTotalMs + ' ms в журнале', true);
      }
    } catch (err) {
      lastText = 'Ошибка отчёта: ' + (err && err.message ? err.message : String(err));
      logEl.textContent = lastText;
      if (options.onStatus) options.onStatus(lastText, false);
    } finally {
      runPerfBtn.disabled = false;
    }
  }

  runTestsBtn.onclick = runTests;
  runPerfBtn.onclick = runPerf;
  copyBtn.onclick = function () {
    const text = lastText || logEl.textContent || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          if (options.onStatus) options.onStatus('Лог скопирован в буфер обмена', true);
        },
        function () {
          if (options.onStatus) options.onStatus('Не удалось скопировать — выделите текст вручную', false);
        }
      );
    } else {
      if (options.onStatus) options.onStatus('Выделите текст лога и скопируйте вручную (Ctrl+C)', false);
    }
  };

  runTests();
}

if (typeof globalThis !== 'undefined') {
  globalThis.KnSKChartDiagnostics = {
    runChartDiagnostics,
    runPerformanceReport,
    openChartDiagnostics,
  };
}
