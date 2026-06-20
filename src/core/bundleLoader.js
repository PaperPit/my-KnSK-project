/**
 * bundleLoader.js — ленивая подгрузка клиентских бандлов через GAS getClientBundle
 */

const bundlePromises = Object.create(null);
let gasAdapter = null;
let dataLabelsRegistered = false;
let pendingMos = null;
let pendingReportId = null;

const LAZY_BUNDLES = new Set([
  'VendorChartJs',
  'DashboardPhase2',
  'MoProfile',
  'VendorChartDataLabels',
  'VendorEcharts',
]);

let chartJsPromise = null;

export function initBundleLoader(adapter) {
  gasAdapter = adapter || null;
}

function injectScript(code) {
  const el = document.createElement('script');
  el.textContent = code;
  document.head.appendChild(el);
}

function injectVendorBundle(code, isReady) {
  injectScript(code);
  if (!isReady()) {
    try {
      (0, eval)(code);
    } catch (err) {
      console.error('[bundleLoader] eval fallback failed:', err);
    }
  }
}

let chartsReadyPromise = null;
let phase2InitPromise = null;

/** Только register — без GAS, если Chart и DataLabels уже в HTML. */
export function ensureChartsReadyLocal() {
  if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
    registerChartDataLabels();
    return Promise.resolve();
  }
  return ensureChartsReadyBundle();
}

/** Chart.js + DataLabels — ленивая подгрузка только если не в HTML. */
export function ensureChartsReadyBundle() {
  if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
    registerChartDataLabels();
    return Promise.resolve();
  }

  if (chartsReadyPromise) return chartsReadyPromise;

  chartsReadyPromise = ensureChartJs()
    .then(function () {
      return ensureChartDataLabels();
    })
    .catch(function (err) {
      chartsReadyPromise = null;
      throw err;
    });

  return chartsReadyPromise;
}

export function waitForChart(maxMs) {
  if (typeof Chart !== 'undefined') {
    return Promise.resolve(window.Chart);
  }
  if (gasAdapter && gasAdapter.originalRun) {
    return ensureChartJs();
  }
  const limit = maxMs || 15000;
  const start = Date.now();
  return new Promise(function (resolve, reject) {
    (function tick() {
      if (typeof Chart !== 'undefined') {
        resolve(window.Chart);
        return;
      }
      if (Date.now() - start > limit) {
        reject(new Error('Chart.js не загрузился'));
        return;
      }
      setTimeout(tick, 25);
    })();
  });
}

/** Ленивая подгрузка VendorChartJs (~205 KB) через getClientBundle. */
export function ensureChartJs() {
  if (typeof Chart !== 'undefined') {
    return Promise.resolve(window.Chart);
  }
  if (chartJsPromise) return chartJsPromise;

  chartJsPromise = loadClientBundle('VendorChartJs')
    .then(function () {
      return waitForChart(15000);
    })
    .catch(function (err) {
      chartJsPromise = null;
      throw err;
    });

  return chartJsPromise;
}

export function loadClientBundle(name) {
  if (!LAZY_BUNDLES.has(name)) {
    return Promise.reject(new Error('Unknown bundle: ' + name));
  }

  if (name === 'VendorChartJs' && typeof Chart !== 'undefined') {
    return Promise.resolve(window.Chart);
  }
  if (name === 'DashboardPhase2' && window.DashboardPhase2) {
    return Promise.resolve();
  }
  if (name === 'MoProfile' && window.MoProfile) {
    return Promise.resolve();
  }
  if (name === 'VendorEcharts' && typeof echarts !== 'undefined') {
    return Promise.resolve(window.echarts);
  }
  if (name === 'VendorChartDataLabels' && typeof ChartDataLabels !== 'undefined') {
    return Promise.resolve(window.ChartDataLabels);
  }

  if (bundlePromises[name]) return bundlePromises[name];

  if (!gasAdapter || !gasAdapter.originalRun) {
    return Promise.reject(new Error('GAS API недоступен для загрузки ' + name));
  }

  bundlePromises[name] = gasAdapter
    .call('getClientBundle', { params: [name] })
    .then(function (code) {
      if (!code) throw new Error('Пустой бандл: ' + name);
      if (name === 'VendorChartJs') {
        injectVendorBundle(code, function () {
          return typeof Chart !== 'undefined';
        });
      } else if (name === 'VendorChartDataLabels') {
        injectVendorBundle(code, function () {
          return typeof ChartDataLabels !== 'undefined';
        });
        registerChartDataLabels();
      } else {
        injectScript(code);
      }
    })
    .catch(function (err) {
      delete bundlePromises[name];
      throw err;
    });

  return bundlePromises[name];
}

export function registerChartDataLabels() {
  if (dataLabelsRegistered || typeof Chart === 'undefined' || typeof ChartDataLabels === 'undefined') {
    return;
  }
  Chart.register(ChartDataLabels);
  dataLabelsRegistered = true;
}

export function ensureChartDataLabels() {
  if (typeof ChartDataLabels !== 'undefined') {
    registerChartDataLabels();
    return Promise.resolve();
  }
  return loadClientBundle('VendorChartDataLabels');
}

export function ensureDashboardPhase2() {
  if (window.DashboardPhase2) {
    return Promise.resolve();
  }
  return loadClientBundle('DashboardPhase2');
}

/**
 * Загрузить DashboardPhase2 и вызвать init один раз.
 * @param {{ onStatus?: function, gasAdapter?: object }} options
 */
export function ensurePhase2Initialized(options) {
  if (window.DashboardPhase2 && window.DashboardPhase2.__knskInited) {
    return Promise.resolve(window.DashboardPhase2);
  }
  if (phase2InitPromise) return phase2InitPromise;

  const opts = options || {};
  phase2InitPromise = ensureDashboardPhase2()
    .then(function () {
      if (window.DashboardPhase2 && !window.DashboardPhase2.__knskInited) {
        window.DashboardPhase2.init({
          onStatus: opts.onStatus || null,
          gasAdapter: opts.gasAdapter || gasAdapter,
        });
        window.DashboardPhase2.__knskInited = true;
      }
      return window.DashboardPhase2;
    })
    .catch(function (err) {
      phase2InitPromise = null;
      throw err;
    });

  return phase2InitPromise;
}

/** Низкоприоритетная подгрузка Phase2 после отрисовки дашборда. */
export function schedulePhase2Idle(options) {
  const opts = options || {};
  const run = function () {
    ensurePhase2Initialized(opts)
      .then(function (phase2) {
        if (typeof opts.onReady === 'function') opts.onReady(phase2);
      })
      .catch(function (err) {
        if (typeof console !== 'undefined') console.warn('[Phase2 idle]', err);
      });
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 800);
  }
}

export function setMoProfileContext(mos, reportId) {
  pendingMos = mos || null;
  pendingReportId = reportId != null && reportId !== '' ? reportId : null;
  if (window.MoProfile) {
    window.MoProfile.setCurrentMos(pendingMos);
    window.MoProfile.setCurrentReportId(pendingReportId);
  }
}

export function ensureMoProfile() {
  return loadClientBundle('MoProfile').then(function () {
    if (window.MoProfile && gasAdapter) {
      window.MoProfile.init({ gasAdapter: gasAdapter });
      if (pendingMos) window.MoProfile.setCurrentMos(pendingMos);
      if (pendingReportId != null) window.MoProfile.setCurrentReportId(pendingReportId);
    }
  });
}

export function ensureEcharts() {
  if (typeof echarts !== 'undefined') return Promise.resolve(window.echarts);
  return loadClientBundle('VendorEcharts').then(function () {
    return window.echarts;
  });
}

const bundleLoaderApi = {
  initBundleLoader,
  loadClientBundle,
  waitForChart,
  ensureChartJs,
  ensureChartsReadyLocal,
  ensureChartsReadyBundle,
  registerChartDataLabels,
  ensureChartDataLabels,
  ensureDashboardPhase2,
  ensurePhase2Initialized,
  schedulePhase2Idle,
  ensureMoProfile,
  ensureEcharts,
  setMoProfileContext,
};

if (typeof window !== 'undefined') {
  window.KnSKBundleLoader = bundleLoaderApi;
}
