/**
 * Фаза 1: сигналы, KPI с дельтой, bar-рейтинги, таблица с heatmap и поиском
 */
const DashboardPhase1 = (function () {
  const plans = (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.plans)
    ? CONFIG.plans
    : { year: 220000, weekly: 4583, threshold: 70 };
  const PLAN_YEAR = plans.year;
  const PLAN_WEEKLY = plans.weekly;
  const PLAN_THRESHOLD = plans.threshold;
  const rankCharts = {};
  const MIN_POSITIVE_KNSK_FOR_COVERAGE_ANTITOP = 10;

  function extractNumber(v) {
    if (!v) return 0;
    let s = String(v).trim();
    if (s === '-' || s === '') return 0;
    let sign = 1;
    if (s.startsWith('+')) s = s.substring(1);
    else if (s.startsWith('-')) {
      sign = -1;
      s = s.substring(1);
    }
    const m = s.match(/^(\d+[\d\s]*?)(?:\s*\(|$)/);
    if (m) return sign * (parseInt(m[1].replace(/\s/g, ''), 10) || 0);
    return sign * (parseInt(s, 10) || 0);
  }

  function extractFact(v) {
    if (!v) return 0;
    const m = String(v).match(/(\d[\d\s]*)/);
    return m ? parseInt(m[1].replace(/\s/g, ''), 10) : 0;
  }

  /** Приведение чисел из JSON архива (строки, пробелы, «6052 (97%)») */
  function toNum(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number' && !isNaN(v)) return v;
    const n = extractNumber(v);
    if (n !== 0) return n;
    return extractFact(v);
  }

  function normalizeArchiveReport(report) {
    if (!report || typeof report !== 'object') return null;
    const normalized = Object.assign({}, report);
    let mos = normalized.mosData || normalized.MOSData || normalized.data;
    if (typeof mos === 'string') {
      try {
        mos = JSON.parse(mos);
      } catch (e) {
        mos = [];
      }
    }
    if (!Array.isArray(mos)) mos = [];
    normalized.mosData = mos;
    return normalized;
  }

  function buildMosFromData(data) {
    if (!data || !data.length) return [];

    const firstRow = data[0];
    if (!firstRow || typeof firstRow !== 'object') return [];

    const hasProcessedShape =
      (firstRow.name != null || firstRow['Наименование МО']) &&
      (firstRow.plan != null ||
        firstRow.fact != null ||
        firstRow['План на год'] != null ||
        firstRow['Общий итог'] != null);

    const mos = [];

    if (hasProcessedShape) {
      data.forEach((r) => {
        const plan = toNum(r.plan != null ? r.plan : r['План на год']);
        const fact = toNum(r.fact != null ? r.fact : r['Общий итог']);
        const percentRaw = r.percent != null ? toNum(r.percent) : plan ? (fact / plan) * 100 : 0;
        mos.push({
          name: r.name || r['Наименование МО'] || 'МО',
          plan,
          fact,
          percent: percentRaw,
          growth: toNum(r.growth != null ? r.growth : r['Динамика с прошлой недели']),
          colon: toNum(r.colon != null ? r.colon : r['Прошли колоноскопию']),
          zno: toNum(r.zno != null ? r.zno : r['Выявлено ЗНО C18-C21']),
          noDev: toNum(r.noDev != null ? r.noDev : r['Нет отклонений']),
          hasDev: toNum(r.hasDev != null ? r.hasDev : r['Есть отклонения']),
        });
      });
    } else {
      data.forEach((r) => {
        const plan = extractNumber(r['План на год']);
        const fact = extractFact(r['Общий итог']);
        mos.push({
          name: r['Наименование МО'] || r.name || 'МО',
          plan,
          fact,
          percent: plan ? (fact / plan) * 100 : 0,
          growth: extractNumber(r['Динамика с прошлой недели']),
          colon: extractNumber(r['Прошли колоноскопию']),
          zno: extractNumber(r['Выявлено ЗНО C18-C21']),
          noDev: extractNumber(r['Нет отклонений']),
          hasDev: extractNumber(r['Есть отклонения']),
        });
      });
    }

    return mos;
  }

  function computeTotals(mos) {
    const t = {
      plan: 0,
      fact: 0,
      colon: 0,
      zno: 0,
      noDev: 0,
      hasDev: 0,
      growth: 0,
      percent: 0,
      colonPercent: 0,
    };
    mos.forEach((m) => {
      t.plan += m.plan;
      t.fact += m.fact;
      t.colon += m.colon;
      t.zno += m.zno;
      t.noDev += m.noDev;
      t.hasDev += m.hasDev;
      t.growth += m.growth;
    });
    t.percent = t.plan ? (t.fact / t.plan) * 100 : 0;
    t.colonPercent = t.hasDev ? (t.colon / t.hasDev) * 100 : 0;
    return t;
  }

  function computeTotalsFromMosData(mosData) {
    return computeTotals(buildMosFromData(mosData));
  }

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
    const icon = diff > 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    let text;

    if (o.isPercent) {
      text = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} п.п.${suffix}`;
    } else if (o.format === 'locale') {
      text = `${diff > 0 ? '+' : ''}${Math.round(diff).toLocaleString('ru-RU')}${suffix}`;
    } else {
      text = `${diff > 0 ? '+' : ''}${diff}${suffix}`;
    }

    return `<span class="kpi-delta ${cls}"><i class="fas ${icon}"></i> ${text} к прошлому отчёту</span>`;
  }

  function setDeltaEl(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

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
      growthEl.innerHTML = `<i class="fas fa-arrow-up"></i> +${t.growth.toLocaleString('ru-RU')} за неделю`;
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

  function buildSignals(mos, totals, previousMos) {
    const signals = [];
    const below = mos.filter((m) => m.percent < PLAN_THRESHOLD);
    if (below.length) {
      const severity = below.length >= mos.length * 0.3 ? 'signal-danger' : 'signal-warn';
      signals.push({
        className: severity,
        icon: 'fa-triangle-exclamation',
        text: `${below.length} из ${mos.length} МО ниже ${PLAN_THRESHOLD}% годового плана КнСК`,
      });
    } else {
      signals.push({
        className: 'signal-success',
        icon: 'fa-circle-check',
        text: `Все МО выполняют план не ниже ${PLAN_THRESHOLD}% (по текущей выборке)`,
      });
    }

    const weekPct = totals.growth ? ((totals.growth / PLAN_WEEKLY) * 100).toFixed(1) : '0';
    const weekClass = parseFloat(weekPct) >= 100 ? 'signal-success' : parseFloat(weekPct) >= 70 ? 'signal-warn' : 'signal-danger';
    signals.push({
      className: weekClass,
      icon: 'fa-calendar-week',
      text: `Недельный прирост ${totals.growth.toLocaleString('ru-RU')} исследований — ${weekPct}% от плана ${PLAN_WEEKLY.toLocaleString('ru-RU')}/нед.`,
    });

    signals.push({
      className: 'signal-warn',
      icon: 'fa-stethoscope',
      text: `Охват колоноскопией: ${totals.colonPercent.toFixed(1)}% (${totals.colon.toLocaleString('ru-RU')} из ${totals.hasDev.toLocaleString('ru-RU')} с положительным КнСК)`,
    });

    const topGrowth = [...mos].sort((a, b) => (b.growth || 0) - (a.growth || 0)).slice(0, 3);
    if (topGrowth.length && topGrowth[0].growth > 0) {
      signals.push({
        className: 'signal-success',
        icon: 'fa-arrow-up',
        text: `Лидеры прироста КнСК за неделю: ${topGrowth.map((m) => `${truncateName(m.name, 28)} (+${m.growth})`).join('; ')}`,
      });
    }

    const colonLeaders = getColonGrowthLeaders(mos, previousMos);
    if (colonLeaders.length) {
      signals.push({
        className: 'signal-success',
        icon: 'fa-stethoscope',
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
          `<li class="${s.className}"><i class="fas ${s.icon}"></i><span>${escapeHtml(s.text)}</span></li>`
      )
      .join('');
  }

  function truncateName(name, max) {
    const n = name || 'МО';
    return n.length > max ? `${n.slice(0, max - 1)}…` : n;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function destroyRankCharts() {
    Object.keys(rankCharts).forEach((key) => {
      if (rankCharts[key]) {
        rankCharts[key].destroy();
        rankCharts[key] = null;
      }
    });
  }

  function renderHorizontalRankChart(canvasId, items, valueKey, color, label, xScaleOptions) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    if (rankCharts[canvasId]) {
      rankCharts[canvasId].destroy();
    }

    const labels = items.map((m) => truncateName(m.name, 32));
    const values = items.map((m) => m[valueKey]);

    const defaultXScale = {
      beginAtZero: true,
      min: valueKey === 'percent' || valueKey === 'coverage' ? 0 : undefined,
      max: valueKey === 'percent' || valueKey === 'coverage' ? 100 : undefined,
      grace: valueKey === 'coverage' ? 0 : undefined,
      ticks: {
        callback: (v) => (valueKey === 'percent' || valueKey === 'coverage' ? `${v}%` : v),
      },
    };
    const xScale = Object.assign({}, defaultXScale, xScaleOptions || {});

    rankCharts[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label,
            data: values,
            backgroundColor: color,
            borderRadius: 6,
            barThickness: 18,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 24 } },
        plugins: {
          legend: { display: false },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'end',
            clip: valueKey !== 'coverage',
            color: '#1e293b',
            font: { weight: '700', size: valueKey === 'coverage' ? 9 : 10 },
            formatter: (v, ctx) => {
              if (valueKey === 'coverage') {
                const m = items[ctx.dataIndex];
                return `${v.toFixed(1)}% (${m.colon}/${m.hasDev})`;
              }
              if (valueKey === 'percent') return `${v.toFixed(1)}%`;
              return v;
            },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const m = items[ctx.dataIndex];
                if (valueKey === 'coverage') {
                  return `${ctx.raw.toFixed(1)}% — ${m.colon} из ${m.hasDev} положит. КнСК`;
                }
                if (valueKey === 'percent') {
                  return `${ctx.raw.toFixed(1)}% — ${m.fact.toLocaleString('ru-RU')} / ${m.plan.toLocaleString('ru-RU')}`;
                }
                return String(ctx.raw);
              },
            },
          },
        },
        scales: {
          x: xScale,
          y: { ticks: { font: { size: 10 } } },
        },
      },
    });

    requestAnimationFrame(function () {
      if (rankCharts[canvasId]) rankCharts[canvasId].resize();
    });
  }

  function renderRankCharts(mos) {
    const sortedByPlan = [...mos].sort((a, b) => b.percent - a.percent);
    const top5 = sortedByPlan.slice(0, 5);

    const mosWithKnsk = mos.filter((m) => m.fact > 0);
    const sortedByPlanActive = [...mosWithKnsk].sort((a, b) => b.percent - a.percent);
    const bottom5 = sortedByPlanActive.slice(-5).reverse();

    renderHorizontalRankChart('top5PlanChart', top5, 'percent', '#1f8a4c', '% плана', {
      min: 0,
      max: 150,
      beginAtZero: true,
    });
    renderHorizontalRankChart('bottom5PlanChart', bottom5, 'percent', '#e67e22', '% плана');

    const withCoverage = mos
      .filter((m) => m.fact > 0)
      .map((mo) => ({
        ...mo,
        coverage: mo.hasDev > 0 ? (mo.colon / mo.hasDev) * 100 : 0,
      }));
    const sortedCov = [...withCoverage].sort((a, b) => b.coverage - a.coverage);
    const coverageXScale = { min: 0, max: 100, grace: 0, beginAtZero: true };
    const bottomCovPool = sortedCov.filter((m) => m.hasDev >= MIN_POSITIVE_KNSK_FOR_COVERAGE_ANTITOP);
    renderHorizontalRankChart('top5CoverageChart', sortedCov.slice(0, 5), 'coverage', '#2c7da0', '% охвата', coverageXScale);
    renderHorizontalRankChart('bottom5CoverageChart', bottomCovPool.slice(-5).reverse(), 'coverage', '#c0392b', '% охвата', coverageXScale);
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

        return `<tr class="${match ? 'mo-row-clickable' : 'table-row-hidden'}" data-mo-idx="${i}" data-mo-name="${escapeHtml(m.name)}">
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

  function setupTableSearch() {
    const input = document.getElementById('moTableSearch');
    if (!input || tableSearchBound) return;
    tableSearchBound = true;
    input.addEventListener('input', function () {
      renderTableRows(lastMosForTable, input.value);
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

  function buildCoverageChart(mosData) {
    const canvas = document.getElementById('coverageChart');
    const inner = document.getElementById('coverageChartInner');
    if (!canvas || !mosData || !mosData.length) return;

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
    const barWidth = 56;
    const chartWidth = Math.max(sorted.length * barWidth, 480);
    if (inner) inner.style.width = `${chartWidth}px`;
    canvas.width = chartWidth;
    canvas.height = 280;
    canvas.style.width = `${chartWidth}px`;
    canvas.style.height = '280px';

    const labels = sorted.map((m) => truncateName(m.name, 26));
    const data = sorted.map((m) => m.coverage);

    if (coverageChartInstance) coverageChartInstance.destroy();
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
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const m = sorted[ctx.dataIndex];
                return `${ctx.raw.toFixed(1)}% (колоноскопий: ${m.colon} из ${m.hasDev} положит.)`;
              },
            },
          },
          datalabels: {
            display: true,
            color: '#1e293b',
            anchor: 'end',
            align: 'top',
            formatter: (val) => `${val.toFixed(1)}%`,
            font: { weight: 'bold', size: 10 },
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

  function renderChartsDeferred(mos) {
    scheduleIdle(function () {
      renderRankCharts(mos);
      buildCoverageChart(mos);
    });
  }

  function finishRender(mos, totals) {
    const now = new Date().toLocaleString('ru-RU');
    const updateEl = document.getElementById('updateTime');
    const reportEl = document.getElementById('reportDate');
    if (updateEl) updateEl.innerHTML = `<i class="far fa-clock"></i> Обновлено: ${now}`;
    if (reportEl) reportEl.innerHTML = now;
    return { mos: mos, totals: totals };
  }

  /**
   * @param {Array} data — mosData или сырые строки CSV
   * @param {{ previousTotals?: object, previousMos?: Array, mos?: Array, progressive?: boolean }} options
   * @returns {Promise<{ mos: Array, totals: object }>}
   */
  function renderAll(data, options) {
    const opts = options || {};
    const mos = opts.mos || buildMosFromData(data);
    if (!mos.length) return Promise.resolve({ mos: [], totals: null });

    hideLoadingState();
    destroyRankCharts();

    const totals = renderKpis(mos, opts.previousTotals);
    renderSignals(mos, totals, opts.previousMos || null);

    if (opts.progressive === false) {
      renderTable(mos);
      renderRankCharts(mos);
      buildCoverageChart(mos);
      return Promise.resolve(finishRender(mos, totals));
    }

    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        renderTable(mos);
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
