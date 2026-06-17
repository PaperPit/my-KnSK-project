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
  computeTopColonCoverageGainers,
  COVERAGE_RANK_TOTAL,
  getPlans,
  truncateName,
  icon,
} from '../lib/index.js';

function getBundleLoader() {
  return typeof window !== 'undefined' ? window.KnSKBundleLoader : null;
}

const DashboardPhase2 = (function () {
  const echartsInstances = {};
  let gasAdapter = null;
  let statusCallback = null;
  let tableClickBound = false;
  let lastMos = [];
  let lastPreviousMos = null;
  const archiveReportCache = Object.create(null);
  const compareInflight = Object.create(null);
  let comparePrefetchTimer = null;

  function cacheArchiveReport(id, report) {
    if (id != null && report) archiveReportCache[Number(id)] = report;
  }

  function getCachedArchiveReport(id) {
    return archiveReportCache[Number(id)] || null;
  }

  function reportMoError(message, err) {
    if (err) console.error(err);
    if (statusCallback) statusCallback(message, false);
  }

  function loadEcharts() {
    const loader = getBundleLoader();
    if (!loader) {
      return Promise.reject(new Error('KnSKBundleLoader не инициализирован'));
    }
    return loader.ensureEcharts();
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

  function pluralRu(n, one, few, many) {
    const abs = Math.abs(n);
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  function formatRankChangeText(m) {
    const total = COVERAGE_RANK_TOTAL;
    if (m.rankRise > 0) {
      const word = pluralRu(m.rankRise, 'позицию', 'позиции', 'позиций');
      return `Поднялись на ${m.rankRise} ${word} в рейтинге (с ${m.rankEarlier}-го на ${m.rankLater}-е место из ${total})`;
    }
    if (m.rankRise < 0) {
      const drop = Math.abs(m.rankRise);
      const word = pluralRu(drop, 'позицию', 'позиции', 'позиций');
      return `Опустились на ${drop} ${word} в рейтинге (с ${m.rankEarlier}-го на ${m.rankLater}-е место из ${total})`;
    }
    return `Место в рейтинге не изменилось (${m.rankLater}-е из ${total})`;
  }

  function formatColonPeriodText(m) {
    const word = pluralRu(m.colonLater, 'колоноскопия', 'колоноскопии', 'колоноскопий');
    if (m.colonDelta === 0) {
      return `За период: ${m.colonLater.toLocaleString('ru-RU')} ${word} (без прироста)`;
    }
    const deltaWord = pluralRu(Math.abs(m.colonDelta), 'колоноскопию', 'колоноскопии', 'колоноскопий');
    const sign = m.colonDelta > 0 ? '+' : '−';
    return `За период: ${sign}${Math.abs(m.colonDelta).toLocaleString('ru-RU')} ${deltaWord} (всего ${m.colonLater.toLocaleString('ru-RU')} ${word}, было ${m.colonEarlier.toLocaleString('ru-RU')})`;
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
    initChart('moDrawerChart')
      .then(function (chart) {
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
      })
      .catch(function (err) {
        reportMoError('Не удалось построить диаграмму МО', err);
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
        ${icon('microscope')} Глубокий анализ МО
      </button>
    `;

    const profileBtn = document.getElementById('moDrawerProfileBtn');
    if (profileBtn) {
      profileBtn.addEventListener('click', function () {
        const loader = getBundleLoader();
        if (!loader) {
          reportMoError('Модуль профиля МО не инициализирован');
          return;
        }
        closeMoDrawer();
        loader
          .ensureMoProfile()
          .then(function () {
            if (window.MoProfile && mo.name) {
              window.MoProfile.open(mo.name);
            }
          })
          .catch(function (err) {
            reportMoError('Не удалось открыть глубокий анализ МО', err);
          });
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
      setTimeout(prefetchCompareReports, 100);
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

    function renderColonCoverageLeaderList(items) {
      if (!items.length) {
        return '<li class="compare-mo-empty">Нет МО с ростом охвата колоноскопией среди КнСК+ за период</li>';
      }
      return items
        .map((m) => {
          const rel =
            m.relativePctGrowth != null
              ? `+${m.relativePctGrowth.toFixed(0)}% к своему уровню охвата`
              : `с 0% до ${m.coverageLater.toFixed(1)}% охвата`;
          return `<li class="compare-mo-list-item--rich">
            <span class="compare-mo-list-main">
              <strong>${escapeHtml(truncateName(m.name, 40))}</strong>
              <span class="compare-mo-list-sub">Охват КнСК+: ${m.coverageEarlier.toFixed(1)}% → ${m.coverageLater.toFixed(1)}%</span>
              <span class="compare-mo-list-sub compare-mo-list-sub--meta">${formatRankChangeText(m)}</span>
              <span class="compare-mo-list-sub compare-mo-list-sub--meta">${formatColonPeriodText(m)}</span>
            </span>
            <span class="compare-mo-list-badges">
              <strong class="compare-mo-delta up">${rel}</strong>
            </span>
          </li>`;
        })
        .join('');
    }

    const colonCoverageLeaders = computeTopColonCoverageGainers(mosA, mosB, {
      minHasDev: 10,
      limit: 5,
    });

    function kpiCard(modifier, iconName, label, valA, valB, earlier, later, isPct) {
      return `
        <div class="compare-kpi compare-kpi--${modifier}">
          <div class="compare-kpi-head">
            <span class="compare-kpi-icon">${icon(iconName)}</span>
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
          'trending-up',
          '% год. плана',
          `${pctA.toFixed(1)}%`,
          `${pctB.toFixed(1)}%`,
          pctA,
          pctB,
          true
        )}
        ${kpiCard(
          'fact',
          'test-tubes',
          'КнСК (факт)',
          tA.fact.toLocaleString('ru-RU'),
          tB.fact.toLocaleString('ru-RU'),
          tA.fact,
          tB.fact,
          false
        )}
        ${kpiCard(
          'colon',
          'stethoscope',
          'Колоноскопия',
          tA.colon.toLocaleString('ru-RU'),
          tB.colon.toLocaleString('ru-RU'),
          tA.colon,
          tB.colon,
          false
        )}
        ${kpiCard(
          'coverage',
          'line-chart',
          'Охват колоноскопией',
          `${tA.colonPercent.toFixed(1)}%`,
          `${tB.colonPercent.toFixed(1)}%`,
          tA.colonPercent,
          tB.colonPercent,
          true
        )}
        ${kpiCard(
          'zno',
          'biohazard',
          'ЗНО',
          String(tA.zno),
          String(tB.zno),
          tA.zno,
          tB.zno,
          false
        )}
      </div>
      <div class="compare-mo-block compare-mo-block--full">
        <h4>Топ-5 МО по относительному приросту охвата колоноскопией (КнСК+)</h4>
        <p class="compare-mo-block-note">Сортировка — по относительному приросту % охвата КнСК+. Учитываются МО с ≥10 положительными КнСК в позднем периоде. Рейтинг охвата — из ${COVERAGE_RANK_TOTAL} мест.</p>
        <ul class="compare-mo-list compare-mo-list--rich">
          ${renderColonCoverageLeaderList(colonCoverageLeaders)}
        </ul>
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

    const inflightKey = `${idA}_${idB}`;
    if (compareInflight[inflightKey]) {
      return compareInflight[inflightKey];
    }

    if (typeof google === 'undefined' || !google.script?.run) {
      return Promise.reject(new Error('Сравнение доступно только в веб-приложении GAS'));
    }

    const promise = new Promise(function (resolve, reject) {
      google.script.run
        .withSuccessHandler(function (result) {
          if (result && result.reportA) cacheArchiveReport(idA, result.reportA);
          if (result && result.reportB) cacheArchiveReport(idB, result.reportB);
          resolve(result);
        })
        .withFailureHandler(reject)
        .getArchivedReportsForCompare(idA, idB);
    }).finally(function () {
      delete compareInflight[inflightKey];
    });

    compareInflight[inflightKey] = promise;
    return promise;
  }

  function prefetchCompareReports() {
    const idA = parseInt(document.getElementById('compareSelectA')?.value, 10);
    const idB = parseInt(document.getElementById('compareSelectB')?.value, 10);
    if (!idA || !idB || idA === idB) return;
    fetchReportsForCompare(idA, idB).catch(function () {});
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
        requestAnimationFrame(function () {
          renderComparisonPanel(result.reportA, result.reportB, metaA, metaB);
          if (onStatus) onStatus('Сравнение построено', true);
        });
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

    ['compareSelectA', 'compareSelectB'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        clearTimeout(comparePrefetchTimer);
        comparePrefetchTimer = setTimeout(prefetchCompareReports, 350);
      });
    });
  }

  function onResize() {
    Object.keys(echartsInstances).forEach((id) => {
      if (echartsInstances[id]) echartsInstances[id].resize();
    });
  }

  function init(options) {
    gasAdapter = (options && options.gasAdapter) || gasAdapter;
    statusCallback = (options && options.onStatus) || statusCallback;
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
