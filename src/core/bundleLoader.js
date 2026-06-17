/**
 * bundleLoader.js — ленивая подгрузка клиентских бандлов через GAS getClientBundle
 */

const bundlePromises = Object.create(null);
let gasAdapter = null;
let dataLabelsRegistered = false;
let pendingMos = null;
let pendingReportId = null;

const LAZY_BUNDLES = new Set([
  'DashboardPhase2',
  'MoProfile',
  'VendorChartDataLabels',
  'VendorEcharts',
]);

export function initBundleLoader(adapter) {
  gasAdapter = adapter || null;
}

function injectScript(code) {
  const el = document.createElement('script');
  el.textContent = code;
  document.head.appendChild(el);
}

export function waitForChart(maxMs) {
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

export function loadClientBundle(name) {
  if (!LAZY_BUNDLES.has(name)) {
    return Promise.reject(new Error('Unknown bundle: ' + name));
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
      injectScript(code);
      if (name === 'VendorChartDataLabels') registerChartDataLabels();
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
  return loadClientBundle('DashboardPhase2');
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
  registerChartDataLabels,
  ensureChartDataLabels,
  ensureDashboardPhase2,
  ensureMoProfile,
  ensureEcharts,
  setMoProfileContext,
};

if (typeof window !== 'undefined') {
  window.KnSKBundleLoader = bundleLoaderApi;
}
