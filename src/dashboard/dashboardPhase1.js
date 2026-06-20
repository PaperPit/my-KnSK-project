/**
 * =============================================================================
 * DashboardPhase1 — основной дашборд (KPI, сигналы, таблица, рейтинги)
 * =============================================================================
 *
 * ПОДКЛЮЧЕНИЕ: Index.html и Viewer.html → include('DashboardPhase1')
 * API: window.DashboardPhase1.renderAll(data, options) — window-регистрация
 * нужна для include-порядка между отдельными <script>-бандлами.
 *
 * РАЗДЕЛЫ ВНУТРИ:
 *   renderKpis          — 4 карточки KPI (+ дельты к прошлому отчёту)
 *   buildSignals        — блок «Ключевые сигналы» (порог 70%, лидеры)
 *   renderTable         — сводная таблица МО с поиском и heatmap
 *   renderRankCharts    — топ/антитоп Chart.js
 *   buildCoverageChart  — охват колоноскопией (все МО)
 *
 * Планы: PLAN_YEAR (220000), PLAN_WEEKLY (4583), PLAN_THRESHOLD (70) из CONFIG
 * Расчёты МО: import из lib/index.js (esbuild bundle)
 *
 * ПОСЛЕ ПРАВОК: npm run build → clasp push
 * =============================================================================
 */
import {
  getPlans,
  toNum,
  escapeHtml,
  normalizeArchiveReport,
  buildMosFromData,
  computeTotals,
  computeTotalsFromMosData,
  truncateName,
  icon,
  DEFAULT_POPULATION_GROUP,
  filterMosByPopulationGroup,
  getPopulationGroupDefinition,
  getPopulationGroupLabel,
  computeHighVolumeLowPositiveOutliers,
  positiveRateOf,
  KNSK_HIGH_VOLUME_MIN_FACT,
  KNSK_POSITIVE_RATE_Z_THRESHOLD,
} from '../lib/index.js';

function getBundleLoader() {
  return typeof window !== 'undefined' ? window.KnSKBundleLoader : null;
}

function ensureDataLabelsReady() {
  if (typeof ChartDataLabels !== 'undefined') {
    if (typeof Chart !== 'undefined' && !Chart.registry.getPlugin('datalabels')) {
      Chart.register(ChartDataLabels);
    }
    return Promise.resolve();
  }
  const loader = getBundleLoader();
  if (loader) return loader.ensureChartDataLabels();
  return Promise.reject(new Error('ChartDataLabels не загружен'));
}

function ensureChartsReady() {
  const loader = getBundleLoader();
  if (loader && typeof loader.ensureChartsReadyLocal === 'function') {
    return loader.ensureChartsReadyLocal();
  }
  if (loader && typeof loader.ensureChartsReadyBundle === 'function') {
    return loader.ensureChartsReadyBundle();
  }
  if (typeof Chart !== 'undefined') {
    return ensureDataLabelsReady().catch(function () {
      return Promise.resolve();
    });
  }
  return Promise.reject(new Error('Chart.js не загружен'));
}

function perfMark(name, detail) {
  if (typeof window !== 'undefined' && window.KnSKPerf) {
    window.KnSKPerf.perfMark(name, detail);
  }
}

const DashboardPhase1 = (function () {
  const plans = getPlans(typeof CONFIG !== 'undefined' ? CONFIG : null);
  const PLAN_YEAR = plans.year;
  const PLAN_WEEKLY = plans.weekly;
  const PLAN_THRESHOLD = plans.threshold;
  const rankCharts = {};
  const MIN_POSITIVE_KNSK_FOR_COVERAGE_ANTITOP = 10;
  const RANK_CHART_LAYOUT = { padding: { top: 8, bottom: 8, left: 4, right: 108 } };
  let lastRankMosAll = null;
  let selectedRankGroup = DEFAULT_POPULATION_GROUP;
  let rankGroupNavBound = false;

  function getPreviousArchiveId(reportsList, currentId) {
    if (!reportsList || !reportsList.length || currentId == null) return null;
    const sorted = [...reportsList].sort((a, b) => b.id - a.id);
    const idx = sorted.findIndex((r) => r.id === currentId);
    if (idx === -1 || idx >= sorted.length - 1) return null;
    return sorted[idx + 1].id;
  }

  function formatDeltaHtml(current, previous, opts) {
    const o = opts || {};
    const suffix = o.suffix || '';
    const invert = o.invert || false;

    if (previous == null || previous === undefined || (previous === 0 && current === 0)) {
      return '<span class="kpi-delta delta-hidden"></span>';
    }

    const diff = current - previous;
    if (Math.abs(diff) < 0.05 && o.isPercent) {
      return '<span class="kpi-delta delta-neutral">без изменений к прошлому отчёту</span>';
    }
    if (diff === 0) {
      return '<span class="kpi-delta delta-neutral">без изменений к прошлому отчёту</span>';
    }

    const positive = invert ? diff < 0 : diff > 0;
    const cls = positive ? 'delta-up' : 'delta-down';
    const iconName = diff > 0 ? 'arrow-up' : 'arrow-down';
    let text;

    if (o.isPercent) {
      text = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} п.п.${suffix}`;
    } else if (o.format === 'locale') {
      text = `${diff > 0 ? '+' : ''}${Math.round(diff).toLocaleString('ru-RU')}${suffix}`;
    } else {
      text = `${diff > 0 ? '+' : ''}${diff}${suffix}`;
    }

    return `<span class="kpi-delta ${cls}">${icon(iconName)} ${text} к прошлому отчёту</span>`;
  }

  function setDeltaEl(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  // --- KPI: 4 карточки вверху дашборда ---
  function renderKpis(mos, previousTotals) {
    const t = computeTotals(mos);
    const prev = previousTotals || null;

    const yearPercent = PLAN_YEAR ? (t.fact / PLAN_YEAR) * 100 : 0;

    const pctEl = document.getElementById('totalPercent');
    const planFactEl = document.getElementById('totalPlanFact');
    if (pctEl) pctEl.innerHTML = `${yearPercent.toFixed(1)}%`;
    if (planFactEl) {
      planFactEl.innerHTML = `${t.fact.toLocaleString('ru-RU')} / ${PLAN_YEAR.toLocaleString('ru-RU')}`;
    }

    const kskEl = document.getElementById('totalKsk');
    const growthEl = document.getElementById('weeklyGrowth');
    if (kskEl) kskEl.innerHTML = t.fact.toLocaleString('ru-RU');
    if (growthEl) {
      growthEl.innerHTML = `${icon('arrow-up')} +${t.growth.toLocaleString('ru-RU')} за неделю`;
    }

    const colonEl = document.getElementById('totalColonPassed');
    const colonPctEl = document.getElementById('colonPercent');
    if (colonEl) colonEl.innerHTML = t.colon.toLocaleString('ru-RU');
    if (colonPctEl) {
      colonPctEl.innerHTML = `${t.colonPercent.toFixed(1)}% из ${t.hasDev.toLocaleString('ru-RU')} положительных КНСК`;
    }

    const znoEl = document.getElementById('totalZno');
    if (znoEl) znoEl.innerHTML = t.zno.toLocaleString('ru-RU');

    if (prev) {
      const prevYearPercent = PLAN_YEAR ? (prev.fact / PLAN_YEAR) * 100 : 0;
      setDeltaEl('totalPercentDelta', formatDeltaHtml(yearPercent, prevYearPercent, { isPercent: true }));
      setDeltaEl('totalGrowthDelta', formatDeltaHtml(t.growth, prev.growth, { format: 'locale', suffix: ' за неделю' }));
      setDeltaEl('totalColonDelta', formatDeltaHtml(t.colon, prev.colon, { format: 'locale' }));
      setDeltaEl('totalZnoDelta', formatDeltaHtml(t.zno, prev.zno, { format: 'locale' }));
    } else {
      [
        'totalPercentDelta',
        'totalGrowthDelta',
        'totalColonDelta',
        'totalZnoDelta',
      ].forEach((id) => {
        setDeltaEl(id, '<span class="kpi-delta delta-hidden"></span>');
      });
    }

    return t;
  }

  function normalizeMoKey(name) {
    return String(name || '')
      .trim()
      .toLowerCase();
  }

  function getColonGrowthLeaders(mos, previousMos) {
    if (!previousMos || !previousMos.length) return [];
    const prevMap = {};
    previousMos.forEach((m) => {
      prevMap[normalizeMoKey(m.name)] = toNum(m.colon);
    });
    return mos
      .map((m) => ({
        name: m.name,
        colonDelta: toNum(m.colon) - (prevMap[normalizeMoKey(m.name)] || 0),
      }))
      .filter((m) => m.colonDelta > 0)
      .sort((a, b) => b.colonDelta - a.colonDelta)
      .slice(0, 3);
  }

  // --- Автоматические заметки: МО ниже порога, недельный план, лидеры колоноскопии ---
  function buildSignals(mos, totals, previousMos) {
    const signals = [];
    const below = mos.filter((m) => m.percent < PLAN_THRESHOLD);
    if (below.length) {
      const severity = below.length >= mos.length * 0.3 ? 'signal-danger' : 'signal-warn';
      signals.push({
        className: severity,
        icon: 'triangle-alert',
        text: `${below.length} из ${mos.length} МО ниже ${PLAN_THRESHOLD}% годового плана КнСК`,
      });
    } else {
      signals.push({
        className: 'signal-success',
        icon: 'circle-check',
        text: `Все МО выполняют план не ниже ${PLAN_THRESHOLD}% (по текущей выборке)`,
      });
    }

    const weekPct = totals.growth ? ((totals.growth / PLAN_WEEKLY) * 100).toFixed(1) : '0';
    const weekClass = parseFloat(weekPct) >= 100 ? 'signal-success' : parseFloat(weekPct) >= 70 ? 'signal-warn' : 'signal-danger';
    signals.push({
      className: weekClass,
      icon: 'calendar-days',
      text: `${weekPct}% недельного плана (норма ${PLAN_WEEKLY.toLocaleString('ru-RU')}/нед.) — прирост ${totals.growth.toLocaleString('ru-RU')} исследований`,
    });

    const COLON_THRESHOLD = 50;
    const belowColon = mos.filter((m) => {
      const coverage = m.hasDev > 0 ? (m.colon / m.hasDev) * 100 : 0;
      return coverage < COLON_THRESHOLD;
    });
    if (belowColon.length) {
      const colonSeverity = belowColon.length >= mos.length * 0.3 ? 'signal-danger' : 'signal-warn';
      signals.push({
        className: colonSeverity,
        icon: 'building-2',
        text: `${belowColon.length} из ${mos.length} МО ниже ${COLON_THRESHOLD}% колоноскопий у пациентов с положительным результатом КнСК`,
      });
    }

    signals.push({
      className: 'signal-warn',
      icon: 'stethoscope',
      text: `Охват колоноскопией: ${totals.colonPercent.toFixed(1)}% (${totals.colon.toLocaleString('ru-RU')} из ${totals.hasDev.toLocaleString('ru-RU')} с положительным КнСК)`,
    });

    const topGrowth = [...mos].sort((a, b) => (b.growth || 0) - (a.growth || 0)).slice(0, 3);
    if (topGrowth.length && topGrowth[0].growth > 0) {
      signals.push({
        className: 'signal-success',
        icon: 'arrow-up',
        text: `Лидеры прироста КнСК за неделю: ${topGrowth.map((m) => `${truncateName(m.name, 28)} (+${m.growth})`).join('; ')}`,
      });
    }

    const colonLeaders = getColonGrowthLeaders(mos, previousMos);
    if (colonLeaders.length) {
      signals.push({
        className: 'signal-success',
        icon: 'stethoscope',
        text: `Лидеры прироста колоноскопий за неделю: ${colonLeaders.map((m) => `${truncateName(m.name, 28)} (+${m.colonDelta})`).join('; ')}`,
      });
    }

    return signals.slice(0, 6);
  }

  function renderSignals(mos, totals, previousMos) {
    const list = document.getElementById('signalsList');
    if (!list) return;

    const signals = buildSignals(mos, totals, previousMos);
    list.innerHTML = signals
      .map(
        (s) =>
          `<li class="${s.className}">${icon(s.icon)}<span>${escapeHtml(s.text)}</span></li>`
      )
      .join('');
  }

  function getChartOnCanvas(canvas) {
    if (!canvas || typeof Chart === 'undefined' || typeof Chart.getChart !== 'function') return null;
    return Chart.getChart(canvas);
  }

  function releaseCanvasChart(canvas) {
    const onCanvas = getChartOnCanvas(canvas);
    if (onCanvas) onCanvas.destroy();
  }

  function syncRankChartRef(canvasId, canvas) {
    const onCanvas = getChartOnCanvas(canvas);
    const tracked = rankCharts[canvasId];
    if (onCanvas && onCanvas !== tracked) {
      if (tracked && tracked !== onCanvas) tracked.destroy();
      rankCharts[canvasId] = onCanvas;
      return onCanvas;
    }
    return tracked || null;
  }

  function destroyRankCharts() {
    Object.keys(rankCharts).forEach((key) => {
      if (rankCharts[key]) {
        rankCharts[key].destroy();
        rankCharts[key] = null;
      }
    });
    ['top5PlanChart', 'bottom5PlanChart', 'top5CoverageChart', 'bottom5CoverageChart'].forEach(
      function (id) {
        const canvas = document.getElementById(id);
        if (canvas) releaseCanvasChart(canvas);
      }
    );
  }

  function resizeRankCharts() {
    requestAnimationFrame(function () {
      Object.keys(rankCharts).forEach(function (id) {
        if (rankCharts[id]) rankCharts[id].resize();
      });
    });
  }

  function getRankMeta(canvas) {
    if (!canvas._knskRankMeta) {
      canvas._knskRankMeta = { items: [], valueKey: '' };
    }
    return canvas._knskRankMeta;
  }

  function rankChartRatioLabel(m, valueKey) {
    if (!m) return '';
    if (valueKey === 'percent') {
      return `(${m.fact.toLocaleString('ru-RU')} / ${m.plan.toLocaleString('ru-RU')})`;
    }
    if (valueKey === 'coverage') {
      return `(${m.colon.toLocaleString('ru-RU')} / ${m.hasDev.toLocaleString('ru-RU')})`;
    }
    return '';
  }

  /** Подпись справа от конца столбца: только дробь в скобках. */
  function rankChartDatalabelsOptions(showRatio) {
    if (!showRatio) {
      return {
        display: true,
        anchor: 'end',
        align: 'right',
        offset: 10,
        clip: false,
        color: '#0f172a',
        font: { weight: '700', size: 10 },
        formatter: (v) => v,
      };
    }
    return {
      display: true,
      anchor: 'end',
      align: 'right',
      offset: 12,
      clip: false,
      color: '#0f172a',
      font: { weight: '700', size: 10 },
      textAlign: 'center',
      textStrokeColor: 'rgba(255,255,255,0.92)',
      textStrokeWidth: 2,
      formatter: (_v, ctx) => {
        const m = ctx.chart.canvas._knskRankMeta;
        return m ? rankChartRatioLabel(m.items[ctx.dataIndex], m.valueKey) : '';
      },
    };
  }

  function rankTooltipLabelFromMeta(meta, ctx) {
    const m = meta.items[ctx.dataIndex];
    if (!m) return String(ctx.raw);
    const valueKey = meta.valueKey;
    if (valueKey === 'coverage') {
      return `${ctx.raw.toFixed(1)}% — ${m.colon} из ${m.hasDev} положит. КнСК`;
    }
    if (valueKey === 'percent') {
      return `${ctx.raw.toFixed(1)}% — ${m.fact.toLocaleString('ru-RU')} / ${m.plan.toLocaleString('ru-RU')}`;
    }
    return String(ctx.raw);
  }

  function renderVerticalRankChart(canvasId, items, valueKey, color, label, xScaleOptions) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined' || !items || !items.length) return;

    const meta = getRankMeta(canvas);
    meta.items = items;
    meta.valueKey = valueKey;

    const labels = items.map((m) => truncateName(m.name, 28));
    const values = items.map((m) => m[valueKey]);
    const showRatio = valueKey === 'percent' || valueKey === 'coverage';

    const defaultXScale = {
      beginAtZero: true,
      min: valueKey === 'percent' || valueKey === 'coverage' ? 0 : undefined,
      max: valueKey === 'percent' || valueKey === 'coverage' ? 100 : undefined,
      grace: valueKey === 'coverage' ? 0 : undefined,
      ticks: {
        callback: (v) => (valueKey === 'percent' || valueKey === 'coverage' ? `${v}%` : v),
      },
      grid: { color: 'rgba(148, 163, 184, 0.25)' },
    };
    const xScale = Object.assign({}, defaultXScale, xScaleOptions || {});

    const existing = syncRankChartRef(canvasId, canvas);
    const canUpdate =
      existing &&
      typeof existing.update === 'function' &&
      existing.canvas === canvas &&
      existing.config &&
      existing.config.type === 'bar' &&
      existing.options &&
      existing.options.indexAxis === 'y' &&
      existing.data &&
      existing.data.datasets &&
      existing.data.datasets[0];

    if (canUpdate) {
      existing.data.labels = labels;
      existing.data.datasets[0].data = values;
      existing.data.datasets[0].backgroundColor = color;
      existing.data.datasets[0].label = label;
      Object.assign(existing.options.scales.x, xScale);
      existing.options.plugins.datalabels = rankChartDatalabelsOptions(showRatio);
      existing.options.layout = RANK_CHART_LAYOUT;
      existing.update('none');
      resizeRankCharts();
      return;
    }

    if (existing) existing.destroy();
    releaseCanvasChart(canvas);

    const chart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label,
            data: values,
            backgroundColor: color,
            borderRadius: 4,
            maxBarThickness: 30,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: RANK_CHART_LAYOUT,
        plugins: {
          legend: { display: false },
          datalabels: rankChartDatalabelsOptions(showRatio),
          tooltip: {
            callbacks: {
              label(ctx) {
                const m = ctx.chart.canvas._knskRankMeta;
                return m ? rankTooltipLabelFromMeta(m, ctx) : String(ctx.raw);
              },
            },
          },
        },
        scales: {
          x: xScale,
          y: {
            ticks: {
              autoSkip: false,
              font: { size: 10, weight: '500' },
              color: '#334155',
            },
            grid: { display: false },
          },
        },
      },
    });
    rankCharts[canvasId] = chart;

    resizeRankCharts();
  }

  function renderPlanRankCharts(mos) {
    const sortedByPlan = [...mos].sort((a, b) => b.percent - a.percent);
    const top5 = sortedByPlan.slice(0, 5);

    const mosWithKnsk = mos.filter((m) => m.fact > 0);
    const sortedByPlanActive = [...mosWithKnsk].sort((a, b) => b.percent - a.percent);
    const bottom5 = sortedByPlanActive.slice(-5).reverse();

    renderVerticalRankChart('top5PlanChart', top5, 'percent', '#1f8a4c', '% плана', {
      min: 0,
      max: 150,
      beginAtZero: true,
    });
    renderVerticalRankChart('bottom5PlanChart', bottom5, 'percent', '#e67e22', '% плана');
  }

  function renderCoverageRankCharts(mos) {
    const withCoverage = mos
      .filter((m) => m.fact > 0)
      .map((mo) => ({
        ...mo,
        coverage: mo.hasDev > 0 ? (mo.colon / mo.hasDev) * 100 : 0,
      }));
    const sortedCov = [...withCoverage].sort((a, b) => b.coverage - a.coverage);
    const coverageYScale = { min: 0, max: 100, grace: 0, beginAtZero: true };
    const bottomCovPool = sortedCov.filter((m) => m.hasDev >= MIN_POSITIVE_KNSK_FOR_COVERAGE_ANTITOP);
    renderVerticalRankChart(
      'top5CoverageChart',
      sortedCov.slice(0, 5),
      'coverage',
      '#2c7da0',
      '% охвата',
      coverageYScale
    );
    renderVerticalRankChart(
      'bottom5CoverageChart',
      bottomCovPool.slice(-5).reverse(),
      'coverage',
      '#c0392b',
      '% охвата',
      coverageYScale
    );
  }

  function updateRankGroupHint(filteredCount) {
    const hint = document.getElementById('rankGroupHint');
    if (!hint) return;
    const def = getPopulationGroupDefinition(selectedRankGroup);
    if (!def) {
      hint.textContent = '';
      return;
    }
    hint.textContent = `Топы и антитопы среди ${filteredCount} МО категории «${def.label}» (${def.populationRange})`;
  }

  function setRankPopulationGroup(groupId) {
    if (!groupId || groupId === selectedRankGroup) return;
    selectedRankGroup = groupId;
    const nav = document.getElementById('rankPopulationGroupNav');
    if (nav) {
      nav.querySelectorAll('[data-rank-group]').forEach(function (btn) {
        const active = btn.getAttribute('data-rank-group') === groupId;
        btn.classList.toggle('rank-tab--active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }
    if (lastRankMosAll) renderRankCharts(lastRankMosAll);
  }

  function setupRankGroupNav() {
    const nav = document.getElementById('rankPopulationGroupNav');
    if (!nav || rankGroupNavBound) return;
    rankGroupNavBound = true;
    nav.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-rank-group]');
      if (!btn || !nav.contains(btn)) return;
      setRankPopulationGroup(btn.getAttribute('data-rank-group'));
    });
  }

  function getFilteredRankMos(mos) {
    return filterMosByPopulationGroup(mos, selectedRankGroup);
  }

  function renderRankCharts(mos) {
    lastRankMosAll = mos;
    setupRankGroupNav();
    const filtered = getFilteredRankMos(mos);
    updateRankGroupHint(filtered.length);
    renderPlanRankCharts(filtered);
    renderCoverageRankCharts(filtered);
  }

  function formatOutlierRate(value) {
    return value.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function renderOutlierRateBar(positiveRate, meanRate, scaleMax) {
    const rate = Number(positiveRate) || 0;
    const mean = Number(meanRate) || 0;
    const max = Math.max(Number(scaleMax) || 0, rate, mean, 1);
    const moW = Math.min(100, Math.max(rate > 0 ? 1 : 0, (rate / max) * 100));
    const meanW = Math.min(100, Math.max(0, (mean / max) * 100));
    return `<div class="knsk-outlier-rate-bar" role="img" aria-label="Доля КнСК+ ${formatOutlierRate(rate)}% при среднем ${formatOutlierRate(mean)}%">
      <div class="knsk-outlier-rate-track">
        <div class="knsk-outlier-rate-fill" style="width:${moW.toFixed(1)}%"></div>
        <div class="knsk-outlier-rate-mean" style="left:${meanW.toFixed(1)}%" title="Среднее по всем МО"></div>
      </div>
      <div class="knsk-outlier-rate-footer">
        <span class="knsk-outlier-rate-value">${formatOutlierRate(rate)}%</span>
        <span class="knsk-outlier-rate-scale">шкала 0–${formatOutlierRate(max)}%</span>
      </div>
    </div>`;
  }

  function renderKnskVolumeOutlierBlock(mos) {
    const panel = document.getElementById('knskOutlierPanel');
    const benchmarkEl = document.getElementById('knskOutlierBenchmark');
    const listEl = document.getElementById('knskOutlierList');
    const noteEl = document.getElementById('knskOutlierNote');
    if (!panel || !benchmarkEl || !listEl || !noteEl) return;

    const result = computeHighVolumeLowPositiveOutliers(mos, { limit: 5 });
    const bench = result.benchmark;

    if (!result.items.length) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;

    benchmarkEl.className = 'knsk-outlier-subtitle';
    benchmarkEl.textContent = `Средняя доля КнСК+ по МО — ${formatOutlierRate(bench.meanPositiveRate)}% (σ = ${formatOutlierRate(bench.stdPositiveRate)} п.п.)`;

    const scaleMax = Math.max(
      bench.meanPositiveRate + bench.stdPositiveRate * 2,
      bench.networkPositiveRate,
      ...result.items.map((m) => m.positiveRate),
      5
    );

    listEl.innerHTML = result.items
      .map(function (m, idx) {
        const expected = Math.round(m.expectedHasDev);
        const belowExpected = Math.max(0, Math.round(m.expectedHasDev - m.hasDev));
        const deltaText = `на ${belowExpected.toLocaleString('ru-RU')} меньше ожидаемого среднего`;

        return `<li class="compare-mo-rank-item knsk-outlier-item" style="--stagger:${idx}">
          <span class="compare-mo-rank-num" aria-hidden="true">${idx + 1}</span>
          <div class="compare-mo-rank-body">
            <div class="compare-mo-rank-title-row">
              <strong>${escapeHtml(truncateName(m.name, 44))}</strong>
              <span class="compare-mo-delta down">${deltaText}</span>
            </div>
            <span class="compare-mo-list-sub">КнСК: ${m.fact.toLocaleString('ru-RU')} · КнСК+: ${m.hasDev.toLocaleString('ru-RU')} (${formatOutlierRate(m.positiveRate)}%)</span>
            <span class="compare-mo-list-sub compare-mo-list-sub--meta">При средней доле ${formatOutlierRate(bench.meanPositiveRate)}% ожидалось ~${expected.toLocaleString('ru-RU')} положит.</span>
            ${renderOutlierRateBar(m.positiveRate, bench.meanPositiveRate, scaleMax)}
          </div>
        </li>`;
      })
      .join('');

    noteEl.textContent = `Показаны МО с ≥${result.minFact.toLocaleString('ru-RU')} исследованиями КнСК (${bench.highVolumeCount} в выборке), у которых доля положительных результатов КнСК ниже статистически среднего по всем МО`;
  }

  function heatClass(percent) {
    if (percent >= 80) return 'heat-high';
    if (percent >= 40) return 'heat-mid';
    return 'heat-low';
  }

  function badgeClass(percent) {
    if (percent >= 80) return 'high';
    if (percent >= 40) return 'medium';
    return 'low';
  }

  function renderTableRows(mos, filterQuery) {
    const tbody = document.getElementById('tableBody');
    const hint = document.getElementById('tableFilterHint');
    if (!tbody) return;

    const q = (filterQuery || '').trim().toLowerCase();
    let visible = 0;

    tbody.innerHTML = mos
      .map((m, i) => {
        const match = !q || (m.name || '').toLowerCase().includes(q);
        if (match) visible += 1;
        const barW = Math.min(m.percent, 100);
        const hClass = heatClass(m.percent);
        const bClass = badgeClass(m.percent);
        const growthCls = m.growth >= 0 ? 'growth-positive' : 'growth-negative';

        return `<tr class="${match ? 'mo-row-clickable' : 'table-row-hidden'}" data-mo-idx="${i}" data-mo-name="${escapeHtml(m.name)}"${match ? ` tabindex="0" role="button" aria-label="Открыть детали МО ${escapeHtml(m.name)}"` : ''}>
        <td>${i + 1}</td>
        <td style="text-align:left;font-weight:600;">${escapeHtml(m.name)}</td>
        <td>${m.plan.toLocaleString('ru-RU')}</td>
        <td>${m.fact.toLocaleString('ru-RU')}</td>
        <td class="heat-percent">
          <div class="cell-bar-wrap">
            <div class="cell-bar-fill ${hClass}" style="width:${barW}%"></div>
            <span class="cell-bar-label progress-badge ${bClass}">${m.percent.toFixed(1)}%</span>
          </div>
        </td>
        <td class="${growthCls}">${m.growth >= 0 ? '+' : ''}${m.growth}</td>
        <td>${m.noDev}</td>
        <td>${m.hasDev}</td>
        <td>${m.colon}</td>
        <td>${m.zno}</td>
      </tr>`;
      })
      .join('');

    if (hint) {
      hint.textContent = q
        ? `Показано ${visible} из ${mos.length} МО`
        : `Всего ${mos.length} МО`;
    }
  }

  let tableSearchBound = false;
  let lastMosForTable = [];
  let lastTableQuery = null;
  let searchTimer = null;

  function setupTableSearch() {
    const input = document.getElementById('moTableSearch');
    if (!input || tableSearchBound) return;
    tableSearchBound = true;
    // Debounce (150мс): полный innerHTML-рендер строк таблицы на каждое нажатие
    // лагал при большом числе МО. __KNSK_DEBUG включает мгновенный отклик.
    const DEBOUNCE_MS = window.__KNSK_DEBUG ? 0 : 150;
    input.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        const q = input.value;
        if (q === lastTableQuery) return;
        lastTableQuery = q;
        renderTableRows(lastMosForTable, q);
      }, DEBOUNCE_MS);
    });
  }

  function renderTable(mos) {
    const sorted = [...mos].sort((a, b) => b.percent - a.percent);
    lastMosForTable = sorted;
    const input = document.getElementById('moTableSearch');
    renderTableRows(sorted, input ? input.value : '');
    setupTableSearch();
  }

  let coverageChartInstance = null;
  let lastCoverageMos = null;
  let coverageResizeBound = false;
  let coverageObserverBound = false;
  let coveragePainted = false;

  function getCoverageChartWidth(moCount) {
    const scroll = document.getElementById('coverageChartScroll');
    const containerWidth = scroll && scroll.clientWidth > 0 ? scroll.clientWidth : 480;
    const barWidth = 56;
    return Math.max(moCount * barWidth, containerWidth);
  }

  function isCoverageChartNearViewport() {
    const scroll = document.getElementById('coverageChartScroll');
    if (!scroll) return true;
    const rect = scroll.getBoundingClientRect();
    return rect.top < window.innerHeight + 120 && rect.bottom > -120;
  }

  function bindCoverageResize() {
    if (coverageResizeBound || typeof window === 'undefined') return;
    coverageResizeBound = true;
    let resizeTimer = null;
    window.addEventListener('resize', function () {
      if (!lastCoverageMos || !lastCoverageMos.length) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (coveragePainted) paintCoverageChart(lastCoverageMos);
      }, 150);
    });
  }

  function observeCoverageChart() {
    if (coverageObserverBound) return;
    const scroll = document.getElementById('coverageChartScroll');
    if (!scroll) return;
    coverageObserverBound = true;

    if (typeof IntersectionObserver === 'undefined') {
      if (lastCoverageMos && isCoverageChartNearViewport()) paintCoverageChart(lastCoverageMos);
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && lastCoverageMos && lastCoverageMos.length) {
            paintCoverageChart(lastCoverageMos);
          }
        });
      },
      { rootMargin: '120px 0px' }
    );
    observer.observe(scroll);

    if (lastCoverageMos && isCoverageChartNearViewport()) {
      paintCoverageChart(lastCoverageMos);
    }
  }

  function paintCoverageChart(mosData) {
    const canvas = document.getElementById('coverageChart');
    const inner = document.getElementById('coverageChartInner');
    if (!canvas || !mosData || !mosData.length || typeof Chart === 'undefined') return;

    const withCoverage = mosData.map((mo) => {
      const coverage = mo.hasDev > 0 ? (mo.colon / mo.hasDev) * 100 : 0;
      return {
        name: mo.name,
        coverage,
        colon: mo.colon,
        hasDev: mo.hasDev,
      };
    });
    const sorted = [...withCoverage].sort((a, b) => b.coverage - a.coverage);
    const rankTotal = sorted.length;
    sorted.forEach(function (m, idx) {
      m.rank = idx + 1;
      m.rankTotal = rankTotal;
    });
    const chartWidth = getCoverageChartWidth(sorted.length);
    const labels = sorted.map((m) => truncateName(m.name, 26));
    const data = sorted.map((m) => m.coverage);
    canvas._knskCoverageSorted = sorted;

    let existing = coverageChartInstance || getChartOnCanvas(canvas);
    if (existing && existing.canvas !== canvas) {
      existing.destroy();
      existing = null;
      coverageChartInstance = null;
    }

    if (
      existing &&
      typeof existing.update === 'function' &&
      existing.canvas === canvas &&
      existing.config &&
      existing.config.type === 'bar' &&
      existing.data &&
      existing.data.datasets &&
      existing.data.datasets[0]
    ) {
      existing.data.labels = labels;
      existing.data.datasets[0].data = data;
      if (inner) inner.style.width = `${chartWidth}px`;
      existing.resize();
      existing.update('none');
      coverageChartInstance = existing;
      coveragePainted = true;
      return;
    }

    if (existing) existing.destroy();
    releaseCanvasChart(canvas);
    coverageChartInstance = null;

    if (inner) inner.style.width = `${chartWidth}px`;
    canvas.width = chartWidth;
    canvas.height = 280;
    canvas.style.width = `${chartWidth}px`;
    canvas.style.height = '280px';

    coverageChartInstance = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Охват колоноскопией, %',
            data,
            backgroundColor: '#2c7da0',
            borderRadius: 8,
            barPercentage: 0.75,
            categoryPercentage: 0.9,
          },
        ],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        layout: {
          padding: { top: 28, bottom: 4, left: 4, right: 4 },
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (items) => {
                const sortedRows = items[0] && items[0].chart.canvas._knskCoverageSorted;
                const m = sortedRows && sortedRows[items[0].dataIndex];
                return m ? m.name : '';
              },
              label: (ctx) => {
                const sortedRows = ctx.chart.canvas._knskCoverageSorted;
                const m = sortedRows && sortedRows[ctx.dataIndex];
                if (!m) return `${ctx.raw}%`;
                return [
                  `Место ${m.rank} из ${m.rankTotal}`,
                  `${ctx.raw.toFixed(1)}% (колоноскопий: ${m.colon} из ${m.hasDev} положит.)`,
                ];
              },
            },
          },
          datalabels: {
            display: true,
            color: '#1e293b',
            anchor: 'end',
            align: 'top',
            formatter: (val, ctx) => {
              const rank = ctx.dataIndex + 1;
              return `${rank} место\n${val.toFixed(1)}%`;
            },
            font: { weight: '700', size: 9 },
            lineHeight: 1.25,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Процент охвата (%)' },
            ticks: { callback: (val) => `${val}%` },
          },
          x: {
            ticks: { autoSkip: false, maxRotation: 55, minRotation: 35, font: { size: 9 } },
          },
        },
      },
    });
    coveragePainted = true;
  }

  function buildCoverageChart(mosData) {
    lastCoverageMos = mosData;
    bindCoverageResize();
    observeCoverageChart();
    if (mosData && mosData.length && isCoverageChartNearViewport()) {
      paintCoverageChart(mosData);
    }
  }

  const KPI_SKELETON_IDS = [
    'totalPercent',
    'totalPlanFact',
    'totalKsk',
    'weeklyGrowth',
    'totalColonPassed',
    'colonPercent',
    'totalZno',
  ];

  function showLoadingState() {
    const content = document.getElementById('dashboardContent');
    if (content) content.classList.add('dashboard-loading');

    KPI_SKELETON_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.classList.add('skeleton-pulse');
    });

    const list = document.getElementById('signalsList');
    if (list) {
      list.innerHTML = Array(3)
        .fill(
          '<li class="skeleton-signal-row"><span class="skeleton-cell"><span class="skeleton-shimmer"></span></span></li>'
        )
        .join('');
    }

    const tbody = document.getElementById('tableBody');
    if (tbody) {
      const cols = 10;
      tbody.innerHTML = Array(8)
        .fill(0)
        .map(function () {
          return (
            '<tr class="skeleton-row">' +
            Array(cols)
              .fill('<td><div class="skeleton-cell"><div class="skeleton-shimmer"></div></div></td>')
              .join('') +
            '</tr>'
          );
        })
        .join('');
    }
  }

  function hideLoadingState() {
    const content = document.getElementById('dashboardContent');
    if (content) content.classList.remove('dashboard-loading');
    KPI_SKELETON_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.classList.remove('skeleton-pulse');
    });
  }

  function scheduleIdle(fn) {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(fn, { timeout: 150 });
    } else {
      setTimeout(fn, 0);
    }
  }

  let chartsPaintToken = 0;

  function renderChartsDeferred(mos) {
    const token = ++chartsPaintToken;

    function paintCharts() {
      if (token !== chartsPaintToken) return;
      if (typeof Chart === 'undefined') {
        console.error('Chart.js недоступен — рейтинги и охват не отрисованы');
        return;
      }
      try {
        renderRankCharts(mos);
        buildCoverageChart(mos);
        perfMark('charts-painted');
      } catch (err) {
        console.error('Ошибка отрисовки графиков рейтингов:', err);
      }
    }

    function schedulePaint() {
      requestAnimationFrame(paintCharts);
    }

    ensureChartsReady()
      .then(schedulePaint)
      .catch(function (err) {
        console.error('Chart.js / DataLabels:', err);
        if (typeof Chart !== 'undefined') schedulePaint();
      });
  }

  function finishRender(mos, totals) {
    const now = new Date().toLocaleString('ru-RU');
    const updateEl = document.getElementById('updateTime');
    if (updateEl) updateEl.innerHTML = `${icon('clock')} Обновлено: ${now}`;
    return { mos: mos, totals: totals };
  }

  /**
   * @param {Array} data — mosData или сырые строки CSV
   * @param {{ previousTotals?: object, previousMos?: Array, mos?: Array, progressive?: boolean }} options
   * @returns {Promise<{ mos: Array, totals: object }>}
   */
  /**
   * Главная точка входа: отрисовать весь дашборд фазы 1.
   * @param data — сырой CSV или mosData из архива
   * @param options.mos — уже разобранный массив МО (опционально)
   * @param options.previousTotals / previousMos — для дельт и сигналов
   */
  function renderAll(data, options) {
    const opts = options || {};
    const mos = opts.mos || buildMosFromData(data);
    if (!mos.length) return Promise.resolve({ mos: [], totals: null });

    hideLoadingState();
    perfMark('render-all-start');

    const totals = renderKpis(mos, opts.previousTotals);
    perfMark('kpi-rendered');
    renderSignals(mos, totals, opts.previousMos || null);
    renderKnskVolumeOutlierBlock(mos);

    if (opts.progressive === false) {
      renderTable(mos);
      return ensureChartsReady().then(function () {
        renderRankCharts(mos);
        buildCoverageChart(mos);
        return finishRender(mos, totals);
      });
    }

    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        renderTable(mos);
        perfMark('table-rendered');
        resolve(finishRender(mos, totals));
        renderChartsDeferred(mos);
      });
    });
  }

  function resetTableSearchBinding() {
    tableSearchBound = false;
  }

  return {
    PLAN_WEEKLY,
    PLAN_YEAR,
    toNum,
    normalizeArchiveReport,
    buildMosFromData,
    computeTotals,
    computeTotalsFromMosData,
    getPreviousArchiveId,
    renderAll,
    showLoadingState,
    hideLoadingState,
    renderKpis,
    renderSignals,
    renderRankCharts,
    renderKnskVolumeOutlierBlock,
    setRankPopulationGroup,
    getRankPopulationGroup: function () {
      return selectedRankGroup;
    },
    getPopulationGroupLabel,
    renderTable,
    destroyRankCharts,
    resetTableSearchBinding,
    buildSignals,
    buildCoverageChart,
    getColonGrowthLeaders,
  };
})();

if (typeof window !== 'undefined') {
  window.DashboardPhase1 = DashboardPhase1;
}

export default DashboardPhase1;
