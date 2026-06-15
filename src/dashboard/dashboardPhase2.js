/**
 * =============================================================================
 * DashboardPhase2 — сравнение отчётов, drawer МО, режим презентации
 * =============================================================================
 *
 * ПОДКЛЮЧЕНИЕ: после DashboardPhase1
 * Инициализация: DashboardPhase2.init({ onStatus }) — в editor.js / viewer.js
 *
 * РАЗДЕЛЫ:
 *   populateCompareSelects / runCompare — два архивных отчёта, дельты KPI
 *   openMoDrawer — боковая панель по клику на строку таблицы (ECharts)
 *   togglePresentationMode — полноэкран без панелей управления
 *
 * ECharts подгружается динамически (CONFIG.ui.cdn.echarts).
 *
 * ПОСЛЕ ПРАВОК: npm run build → clasp push
 * =============================================================================
 */
import {
  escapeHtml,
  buildMosFromData,
  computeTotals,
  getPlans,
  truncateName,
} from '../lib/index.js';

const DashboardPhase2 = (function () {
  const echartsInstances = {};
  let echartsLoadPromise = null;
  const ECHARTS_URL =
    (typeof CONFIG !== 'undefined' && CONFIG.ui && CONFIG.ui.cdn && CONFIG.ui.cdn.echarts) ||
    'https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js';
  let tableClickBound = false;
  let lastMos = [];
  let lastPreviousMos = null;
  const archiveReportCache = Object.create(null);

  function cacheArchiveReport(id, report) {
    if (id != null && report) archiveReportCache[Number(id)] = report;
  }

  function getCachedArchiveReport(id) {
    return archiveReportCache[Number(id)] || null;
  }

  function loadEcharts() {
    if (typeof echarts !== 'undefined') return Promise.resolve(window.echarts);
    if (echartsLoadPromise) return echartsLoadPromise;

    echartsLoadPromise = new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = ECHARTS_URL;
      script.async = true;
      script.onload = function () {
        resolve(window.echarts);
      };
      script.onerror = function () {
        echartsLoadPromise = null;
        reject(new Error('Не удалось загрузить ECharts'));
      };
      document.head.appendChild(script);
    });

    return echartsLoadPromise;
  }

  function getPlanYear() {
    // Prefer Phase1's resolved constant, then CONFIG, then default.
    if (typeof window !== 'undefined' && window.DashboardPhase1 && window.DashboardPhase1.PLAN_YEAR) {
      return window.DashboardPhase1.PLAN_YEAR;
    }
    const plans = getPlans(typeof CONFIG !== 'undefined' ? CONFIG : null);
    return plans.year;
  }

  function findMoByName(mos, name) {
    const key = String(name || '').trim().toLowerCase();
    return (mos || []).find((m) => String(m.name || '').trim().toLowerCase() === key) || null;
  }

  function sortMosByPlanPercent(mos) {
    return [...(mos || [])].sort((a, b) => b.percent - a.percent);
  }

  function disposeChart(id) {
    if (echartsInstances[id]) {
      echartsInstances[id].dispose();
      delete echartsInstances[id];
    }
  }

  function initChart(domId) {
    const el = document.getElementById(domId);
    if (!el) return Promise.resolve(null);

    return loadEcharts().then(function () {
      disposeChart(domId);
      echartsInstances[domId] = echarts.init(el);
      return echartsInstances[domId];
    });
  }

  function renderMoDrawerChart(mo) {
    initChart('moDrawerChart').then(function (chart) {
      if (!chart || !mo) return;

      const fact = mo.fact || 0;
      const noDev = mo.noDev || 0;
      const hasDev = mo.hasDev || 0;
      const colon = mo.colon || 0;
      const positiveNoColon = Math.max(0, hasDev - colon);
      const accounted = noDev + positiveNoColon + colon;
      const other = Math.max(0, fact - accounted);

      const slices = [
        { name: 'Кол-во иссл. КнСК без отклонений', value: noDev, color: '#2c7da0' },
        { name: 'КнСК+, без колоноскопии', value: positiveNoColon, color: '#e67e22' },
        { name: 'Кол-во колоноскопий пац. с КнСК+', value: colon, color: '#1f8a4c' },
      ];
      if (other > 0) {
        slices.push({ name: 'Прочие', value: other, color: '#94a3b8' });
      }
      const data = slices.filter(function (s) {
        return s.value > 0;
      });

      chart.setOption({
        tooltip: {
          trigger: 'item',
          confine: true,
          position: function (point, _params, _dom, rect, size) {
            const pad = 12;
            const x = rect.x + rect.width - size.contentSize[0] - pad;
            let y = point[1] - size.contentSize[1] / 2;
            y = Math.max(
              rect.y + pad,
              Math.min(y, rect.y + rect.height - size.contentSize[1] - pad)
            );
            return [x, y];
          },
          formatter: '{b}: {c} ({d}% от ' + fact.toLocaleString('ru-RU') + ' КнСК)',
        },
        graphic: [
          {
            type: 'text',
            left: 'center',
            top: 'center',
            style: {
              text: fact.toLocaleString('ru-RU') + '\nКнСК',
              textAlign: 'center',
              fill: '#1e4663',
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 18,
            },
          },
        ],
        series: [
          {
            type: 'pie',
            radius: ['42%', '68%'],
            center: ['50%', '50%'],
            avoidLabelOverlap: true,
            label: {
              fontSize: 10,
              formatter: '{b}\n{c}',
            },
            data: data.map(function (s) {
              return { name: s.name, value: s.value, itemStyle: { color: s.color } };
            }),
          },
        ],
      });
    });
  }

  function formatDeltaSmall(cur, prev, isPercent) {
    if (prev == null || prev === undefined) return '';
    const diff = cur - prev;
    if (diff === 0) return '<span class="m-delta">без изм.</span>';
    const cls = diff > 0 ? 'color:#1f8a4c' : 'color:#c0392b';
    const sign = diff > 0 ? '+' : '';
    const text = isPercent ? `${sign}${diff.toFixed(1)} п.п.` : `${sign}${Math.round(diff).toLocaleString('ru-RU')}`;
    return `<span class="m-delta" style="${cls}">${text} к прошл. отчёту</span>`;
  }

  function openMoDrawer(mo, previousMo) {
    const overlay = document.getElementById('moDrawerOverlay');
    const body = document.getElementById('moDrawerBody');
    const title = document.getElementById('moDrawerTitle');
    if (!overlay || !body || !mo) return;

    if (title) title.textContent = mo.name || 'МО';
    const coverage = mo.hasDev > 0 ? ((mo.colon / mo.hasDev) * 100).toFixed(1) : '0';

    body.innerHTML = `
      <div class="mo-drawer-metrics">
        <div class="mo-drawer-metric">
          <div class="m-label">% плана</div>
          <div class="m-value">${mo.percent.toFixed(1)}%</div>
          ${formatDeltaSmall(mo.percent, previousMo && previousMo.percent, true)}
        </div>
        <div class="mo-drawer-metric">
          <div class="m-label">Факт / план</div>
          <div class="m-value" style="font-size:0.95rem">${mo.fact.toLocaleString('ru-RU')} / ${mo.plan.toLocaleString('ru-RU')}</div>
          ${formatDeltaSmall(mo.fact, previousMo && previousMo.fact, false)}
        </div>
        <div class="mo-drawer-metric">
          <div class="m-label">Динамика</div>
          <div class="m-value">${mo.growth >= 0 ? '+' : ''}${mo.growth}</div>
          ${formatDeltaSmall(mo.growth, previousMo && previousMo.growth, false)}
        </div>
        <div class="mo-drawer-metric">
          <div class="m-label">Колоноскопия</div>
          <div class="m-value">${mo.colon}</div>
          <div class="m-delta">${coverage}% от ${mo.hasDev} КнСК+</div>
        </div>
        <div class="mo-drawer-metric">
          <div class="m-label">Нет откл.</div>
          <div class="m-value">${mo.noDev}</div>
        </div>
        <div class="mo-drawer-metric">
          <div class="m-label">ЗНО</div>
          <div class="m-value">${mo.zno}</div>
          ${formatDeltaSmall(mo.zno, previousMo && previousMo.zno, false)}
        </div>
      </div>
      <div id="moDrawerChart" class="mo-drawer-chart"></div>
      <button type="button" class="mo-drawer-profile-link" id="moDrawerProfileBtn">
        <i class="fas fa-microscope"></i> Глубокий анализ МО
      </button>
    `;

    const profileBtn = document.getElementById('moDrawerProfileBtn');
    if (profileBtn) {
      profileBtn.addEventListener('click', function () {
        closeMoDrawer();
        if (window.MoProfile && mo.name) {
          window.MoProfile.open(mo.name);
        }
      });
    }

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderMoDrawerChart(mo);
  }

  function closeMoDrawer() {
    const overlay = document.getElementById('moDrawerOverlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    disposeChart('moDrawerChart');
  }

  function setupTableRowClicks() {
    const tbody = document.getElementById('tableBody');
    if (!tbody || tableClickBound) return;
    tableClickBound = true;

    tbody.addEventListener('click', function (e) {
      const row = e.target.closest('tr.mo-row-clickable');
      if (!row) return;
      const idx = parseInt(row.getAttribute('data-mo-idx'), 10);
      if (isNaN(idx) || !lastMos[idx]) return;
      const mo = lastMos[idx];
      const prevMo = lastPreviousMos ? findMoByName(lastPreviousMos, mo.name) : null;
      openMoDrawer(mo, prevMo);
    });
  }

  function setupDrawerClose() {
    const overlay = document.getElementById('moDrawerOverlay');
    const closeBtn = document.getElementById('moDrawerClose');
    if (closeBtn) closeBtn.addEventListener('click', closeMoDrawer);
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeMoDrawer();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (document.getElementById('moProfileOverlay')?.classList.contains('open')) {
          window.MoProfile && window.MoProfile.close();
        } else if (document.getElementById('moDrawerOverlay')?.classList.contains('open')) {
          closeMoDrawer();
        } else if (document.getElementById('compareOverlay')?.classList.contains('open')) {
          closeComparePanel();
        } else if (document.body.classList.contains('presentation-mode')) {
          togglePresentationMode(false);
        }
      }
    });
  }

  function togglePresentationMode(force) {
    const on = force !== undefined ? force : !document.body.classList.contains('presentation-mode');
    document.body.classList.toggle('presentation-mode', on);
    Object.keys(echartsInstances).forEach((id) => {
      if (echartsInstances[id]) echartsInstances[id].resize();
    });
    if (window.Chart && Chart.instances) {
      Object.values(Chart.instances).forEach((c) => c.resize());
    }
  }

  function openComparePanel() {
    const overlay = document.getElementById('compareOverlay');
    if (overlay) {
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeComparePanel() {
    const overlay = document.getElementById('compareOverlay');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (!document.getElementById('moDrawerOverlay')?.classList.contains('open')) {
      document.body.style.overflow = '';
    }
  }

  let compareCloseBound = false;

  function setupComparePanelClose() {
    if (compareCloseBound) return;
    compareCloseBound = true;
    const overlay = document.getElementById('compareOverlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeComparePanel();
      });
    }
    document.addEventListener('click', function (e) {
      if (e.target.closest('#comparePanelClose')) closeComparePanel();
    });
  }

  function setupPresentationToggle() {
    const presBtn = document.getElementById('presentationModeBtn');
    const exitBtn = document.getElementById('presentationExitBtn');

    if (presBtn) presBtn.addEventListener('click', () => togglePresentationMode());
    if (exitBtn) exitBtn.addEventListener('click', () => togglePresentationMode(false));
  }

  function populateCompareSelects(list, currentId) {
    const selA = document.getElementById('compareSelectA');
    const selB = document.getElementById('compareSelectB');
    if (!selA || !selB) return;

    const opts = (list || [])
      .map((item) => `<option value="${item.id}">${escapeHtml(item.dateStr || 'Отчёт #' + item.id)}</option>`)
      .join('');

    selA.innerHTML = '<option value="">— Ранний период —</option>' + opts;
    selB.innerHTML = '<option value="">— Поздний период —</option>' + opts;

    if (list && list.length >= 2) {
      const sorted = [...list].sort((a, b) => a.id - b.id);
      selA.value = String(sorted[sorted.length - 2].id);
      selB.value = String(sorted[sorted.length - 1].id);
    } else if (currentId) {
      selB.value = String(currentId);
    }
  }

  function showCompareLoading() {
    const content = document.getElementById('comparePanelContent');
    if (!content) return;
    openComparePanel();
    content.innerHTML = `
      <div class="compare-loading" aria-live="polite">
        <div class="compare-loading-spinner" aria-hidden="true"></div>
        <p>Загрузка отчётов для сравнения…</p>
      </div>`;
  }

  function renderComparisonPanel(reportA, reportB, metaA, metaB) {
    const content = document.getElementById('comparePanelContent');
    if (!content) return;

    const mosA = buildMosFromData(reportA.mosData || reportA);
    const mosB = buildMosFromData(reportB.mosData || reportB);
    const tA = computeTotals(mosA);
    const tB = computeTotals(mosB);
    const planYear = getPlanYear();
    const pctA = planYear ? (tA.fact / planYear) * 100 : 0;
    const pctB = planYear ? (tB.fact / planYear) * 100 : 0;

    const labelA = metaA || 'Отчёт A';
    const labelB = metaB || 'Отчёт B';

    function deltaCell(earlier, later, isPct) {
      const d = later - earlier;
      let cls = 'neutral';
      if (d > 0) cls = 'up';
      else if (d < 0) cls = 'down';
      const sign = d > 0 ? '+' : '';
      const text = isPct ? `${sign}${d.toFixed(1)} п.п.` : `${sign}${Math.round(d).toLocaleString('ru-RU')}`;
      return `<span class="delta ${cls}">${text}</span>`;
    }

    const mapLater = {};
    mosB.forEach((m) => {
      mapLater[String(m.name).trim().toLowerCase()] = m;
    });

    function buildMoChanges(field) {
      return mosA
        .map((m) => {
          const laterMo = mapLater[String(m.name).trim().toLowerCase()];
          return { name: m.name, delta: laterMo ? laterMo[field] - m[field] : 0 };
        })
        .filter((m) => m.delta !== 0)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 5);
    }

    function renderMoChangeList(items) {
      if (!items.length) {
        return '<li class="compare-mo-empty">Нет изменений за период</li>';
      }
      return items
        .map(
          (m) =>
            `<li><span>${escapeHtml(truncateName(m.name, 36))}</span><strong class="compare-mo-delta ${m.delta > 0 ? 'up' : m.delta < 0 ? 'down' : 'neutral'}">${m.delta > 0 ? '+' : ''}${m.delta.toLocaleString('ru-RU')}</strong></li>`
        )
        .join('');
    }

    const factChanges = buildMoChanges('fact');
    const colonChanges = buildMoChanges('colon');

    function kpiCard(modifier, icon, label, valA, valB, earlier, later, isPct) {
      return `
        <div class="compare-kpi compare-kpi--${modifier}">
          <div class="compare-kpi-head">
            <span class="compare-kpi-icon"><i class="fas ${icon}"></i></span>
            <span class="compare-kpi-label">${label}</span>
          </div>
          <div class="compare-kpi-vals">
            <span class="compare-val compare-val--from">${valA}</span>
            <span class="compare-val-arrow" aria-hidden="true">→</span>
            <span class="compare-val compare-val--to">${valB}</span>
          </div>
          ${deltaCell(earlier, later, isPct)}
        </div>`;
    }

    content.innerHTML = `
      <p class="compare-period-note">
        Динамика: <strong>${escapeHtml(labelA)}</strong> → <strong>${escapeHtml(labelB)}</strong>
        <span class="compare-period-hint">Слева — ранний период, справа — поздний. Изменение = поздний − ранний.</span>
      </p>
      <div class="compare-kpi-grid">
        ${kpiCard(
          'plan',
          'fa-chart-line',
          '% год. плана',
          `${pctA.toFixed(1)}%`,
          `${pctB.toFixed(1)}%`,
          pctA,
          pctB,
          true
        )}
        ${kpiCard(
          'fact',
          'fa-vial',
          'КнСК (факт)',
          tA.fact.toLocaleString('ru-RU'),
          tB.fact.toLocaleString('ru-RU'),
          tA.fact,
          tB.fact,
          false
        )}
        ${kpiCard(
          'growth',
          'fa-arrow-trend-up',
          'Прирост за нед.',
          tA.growth.toLocaleString('ru-RU'),
          tB.growth.toLocaleString('ru-RU'),
          tA.growth,
          tB.growth,
          false
        )}
        ${kpiCard(
          'colon',
          'fa-stethoscope',
          'Колоноскопия',
          tA.colon.toLocaleString('ru-RU'),
          tB.colon.toLocaleString('ru-RU'),
          tA.colon,
          tB.colon,
          false
        )}
        ${kpiCard(
          'zno',
          'fa-biohazard',
          'ЗНО',
          String(tA.zno),
          String(tB.zno),
          tA.zno,
          tB.zno,
          false
        )}
      </div>
      <div class="compare-mo-lists-grid">
        <div class="compare-mo-block">
          <h4>Топ-5 МО по приросту КнСК — изменение факта (поздний − ранний)</h4>
          <ul class="compare-mo-list">
            ${renderMoChangeList(factChanges)}
          </ul>
        </div>
        <div class="compare-mo-block">
          <h4>Топ-5 МО по приросту колоноскопий — изменение факта (поздний − ранний)</h4>
          <ul class="compare-mo-list">
            ${renderMoChangeList(colonChanges)}
          </ul>
        </div>
      </div>
    `;
    openComparePanel();
  }

  function fetchReportsForCompare(idA, idB) {
    const cachedA = getCachedArchiveReport(idA);
    const cachedB = getCachedArchiveReport(idB);
    if (cachedA && cachedB) {
      return Promise.resolve({ reportA: cachedA, reportB: cachedB });
    }

    if (typeof google === 'undefined' || !google.script?.run) {
      return Promise.reject(new Error('Сравнение доступно только в веб-приложении GAS'));
    }

    return new Promise(function (resolve, reject) {
      google.script.run
        .withSuccessHandler(function (result) {
          if (result && result.reportA) cacheArchiveReport(idA, result.reportA);
          if (result && result.reportB) cacheArchiveReport(idB, result.reportB);
          resolve(result);
        })
        .withFailureHandler(reject)
        .getArchivedReportsForCompare(idA, idB);
    });
  }

  function runArchiveComparison(onStatus) {
    const idA = parseInt(document.getElementById('compareSelectA')?.value, 10);
    const idB = parseInt(document.getElementById('compareSelectB')?.value, 10);

    if (!idA || !idB) {
      if (onStatus) onStatus('Выберите оба отчёта для сравнения', false);
      return;
    }
    if (idA === idB) {
      if (onStatus) onStatus('Выберите разные отчёты', false);
      return;
    }

    showCompareLoading();
    if (onStatus) onStatus('Загрузка отчётов для сравнения…', true);

    fetchReportsForCompare(idA, idB)
      .then(function (result) {
        const metaA =
          (window.archiveReportsList || []).find((r) => r.id === idA)?.dateStr || `ID ${idA}`;
        const metaB =
          (window.archiveReportsList || []).find((r) => r.id === idB)?.dateStr || `ID ${idB}`;
        renderComparisonPanel(result.reportA, result.reportB, metaA, metaB);
        if (onStatus) onStatus('Сравнение построено', true);
      })
      .catch(function (err) {
        const content = document.getElementById('comparePanelContent');
        if (content) {
          content.innerHTML = `<p class="compare-error">${escapeHtml(err.message || String(err))}</p>`;
        }
        openComparePanel();
        if (onStatus) onStatus('Ошибка сравнения: ' + err.message, false);
      });
  }

  function setupCompareUI(onStatus) {
    const btn = document.getElementById('compareReportsBtn');
    if (btn) btn.addEventListener('click', () => runArchiveComparison(onStatus));
  }

  function onResize() {
    Object.keys(echartsInstances).forEach((id) => {
      if (echartsInstances[id]) echartsInstances[id].resize();
    });
  }

  function init(options) {
    setupDrawerClose();
    setupPresentationToggle();
    setupComparePanelClose();
    setupCompareUI(options && options.onStatus);
    setupTableRowClicks();
    window.addEventListener('resize', onResize);
  }

  /**
   * @param {Array} mos
   * @param {{ totals?: object, previousMos?: Array }} options
   */
  function renderAll(mos, options) {
    const opts = options || {};
    lastMos = sortMosByPlanPercent(mos);
    lastPreviousMos = opts.previousMos || null;
    setupTableRowClicks();
  }

  function resetTableClickBinding() {
    tableClickBound = false;
  }

  return {
    init,
    renderAll,
    populateCompareSelects,
    renderComparisonPanel,
    runArchiveComparison,
    cacheArchiveReport,
    openMoDrawer,
    closeMoDrawer,
    closeComparePanel,
    togglePresentationMode,
    resetTableClickBinding,
  };
})();

// Регистрация в window для include-порядка между <script>-бандлами GAS
if (typeof window !== 'undefined') {
  window.DashboardPhase2 = DashboardPhase2;
}

export default DashboardPhase2;
