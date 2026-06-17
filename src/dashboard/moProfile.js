/**
 * moProfile.js — полноэкранный профиль медицинской организации
 */
import {
  escapeHtml,
  truncateName,
  computeMoRankings,
  rankBadgeClass,
  normalizeMoKey,
  mergeDisplayedMoPoint,
  icon,
} from '../lib/index.js';
import { formatPeriodLabel } from '../lib/dateUtils.js';

const MoProfile = (function () {
  let gasAdapter = null;
  let currentMos = [];
  let currentReportId = null;
  let chartInstances = {};
  let initialized = false;

  function destroyCharts() {
    Object.keys(chartInstances).forEach(function (id) {
      if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
      }
    });
  }

  function setCurrentMos(mos) {
    currentMos = mos || [];
  }

  function setCurrentReportId(reportId) {
    if (reportId == null || reportId === '') {
      currentReportId = null;
      return;
    }
    const id = Number(reportId);
    currentReportId = !isNaN(id) ? id : null;
  }

  function mergeCurrentPoint(history, mo) {
    const periodEl = document.getElementById('periodDisplayText');
    const periodInput = document.getElementById('periodInput');
    const period = periodEl
      ? periodEl.textContent.trim()
      : periodInput
        ? periodInput.value.trim()
        : 'Текущий отчёт';

    return mergeDisplayedMoPoint(history, mo, {
      archiveReportId: currentReportId,
      period,
    });
  }

  function showOverlay() {
    const overlay = document.getElementById('moProfileOverlay');
    if (!overlay) return;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (document.body.classList.contains('presentation-mode')) {
      window.DashboardPhase2 && DashboardPhase2.togglePresentationMode(false);
    }
  }

  function close() {
    const overlay = document.getElementById('moProfileOverlay');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
    destroyCharts();
  }

  function showLoading() {
    const content = document.getElementById('moProfileContent');
    if (!content) return;
    content.innerHTML =
      '<div class="compare-loading"><div class="compare-loading-spinner"></div><span>Загрузка истории МО…</span></div>';
  }

  function showError(msg) {
    const content = document.getElementById('moProfileContent');
    if (!content) return;
    content.innerHTML = `<p class="compare-error">${escapeHtml(msg)}</p>`;
  }

  function formatDelta(cur, prev, isPct) {
    if (prev == null || prev === undefined) return '—';
    const d = cur - prev;
    if (d === 0) return '0';
    const sign = d > 0 ? '+' : '';
    return isPct ? `${sign}${d.toFixed(1)}` : `${sign}${Math.round(d).toLocaleString('ru-RU')}`;
  }

  function renderHistoryTable(history) {
    if (!history.length) {
      return '<p class="compare-period-note">Нет архивных точек для этой МО.</p>';
    }

    let rows = '';
    history.forEach(function (p, i) {
      const prev = i > 0 ? history[i - 1] : null;
      rows += `<tr>
        <td>${escapeHtml(formatPeriodLabel(p.period || p.dateStr || ''))}</td>
        <td>${p.percent.toFixed(1)}%</td>
        <td>${formatDelta(p.percent, prev && prev.percent, true)}</td>
        <td>${p.fact.toLocaleString('ru-RU')}</td>
        <td>${formatDelta(p.fact, prev && prev.fact, false)}</td>
        <td>${p.growth >= 0 ? '+' : ''}${p.growth}</td>
        <td>${p.coverage.toFixed(1)}%</td>
        <td>${p.colon}</td>
        <td>${p.zno}</td>
      </tr>`;
    });

    return `<div class="mo-profile-history">
      <h3>${icon('table-2')} История по отчётам (${history.length})</h3>
      <div class="mo-profile-history-scroll">
        <table>
          <thead><tr>
            <th>Период</th><th>% плана</th><th>Δ %</th><th>Факт</th><th>Δ факт</th>
            <th>Прирост</th><th>Охват</th><th>Колоноск.</th><th>ЗНО</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  }

  function renderRankBadges(rankings) {
    if (!rankings.total) return '';
    const badges = [];
    if (rankings.byPercent) {
      badges.push(
        `<span class="mo-profile-rank-badge ${rankBadgeClass(rankings.byPercent, rankings.total)}">${icon('trophy')} ${rankings.byPercent} место из ${rankings.total} по % выполнения плана иссл. КнСК</span>`
      );
    }
    if (rankings.byCoverage) {
      badges.push(
        `<span class="mo-profile-rank-badge ${rankBadgeClass(rankings.byCoverage, rankings.total)}">${icon('stethoscope')} ${rankings.byCoverage} место из ${rankings.total} по охвату колоноскопией пациентов с КнСК+</span>`
      );
    }
    return `<div class="mo-profile-rank-badges">${badges.join('')}</div>`;
  }

  function renderKpiStrip(mo, rankings) {
    const cov = rankings.coverage ?? (mo.hasDev > 0 ? (mo.colon / mo.hasDev) * 100 : 0);
    return `<div class="mo-profile-kpi-grid">
      <div class="mo-profile-kpi mo-profile-kpi--plan">
        <div class="mo-profile-kpi-label">% годового плана</div>
        <div class="mo-profile-kpi-value">${mo.percent.toFixed(1)}%</div>
      </div>
      <div class="mo-profile-kpi mo-profile-kpi--fact">
        <div class="mo-profile-kpi-label">Факт / план КнСК</div>
        <div class="mo-profile-kpi-value">${mo.fact.toLocaleString('ru-RU')} <span style="font-size:0.75rem;opacity:0.85">/ ${mo.plan.toLocaleString('ru-RU')}</span></div>
      </div>
      <div class="mo-profile-kpi mo-profile-kpi--colon">
        <div class="mo-profile-kpi-label">Охват колоноскопией</div>
        <div class="mo-profile-kpi-value">${cov.toFixed(1)}%</div>
      </div>
      <div class="mo-profile-kpi mo-profile-kpi--growth">
        <div class="mo-profile-kpi-label">Недельный прирост</div>
        <div class="mo-profile-kpi-value">${mo.growth >= 0 ? '+' : ''}${mo.growth}</div>
      </div>
    </div>`;
  }

  function renderChartCards() {
    return `<div class="mo-profile-charts-grid">
      <div class="mo-profile-chart-card"><h4>КнСК динамика % выполнения годового плана</h4><div class="mo-profile-chart-wrap"><canvas id="moProfChartPercent"></canvas></div></div>
      <div class="mo-profile-chart-card"><h4>КнСК накопительный итог</h4><div class="mo-profile-chart-wrap"><canvas id="moProfChartFact"></canvas></div></div>
      <div class="mo-profile-chart-card"><h4>Динамика % охват колоноскопией</h4><div class="mo-profile-chart-wrap"><canvas id="moProfChartCoverage"></canvas></div></div>
      <div class="mo-profile-chart-card"><h4>Недельный прирост</h4><div class="mo-profile-chart-wrap"><canvas id="moProfChartGrowth"></canvas></div></div>
    </div>`;
  }

  function historyLabels(history) {
    return history.map(function (p) {
      const label = formatPeriodLabel(p.period || p.dateStr || '');
      return truncateName(label || `#${p.reportId}`, 18);
    });
  }

  function renderLineChart(canvasId, history, field, color, ySuffix) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById(canvasId);
    if (!canvas || !history.length) return;

    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: historyLabels(history),
        datasets: [
          {
            label: field,
            data: history.map((p) => p[field]),
            borderColor: color,
            backgroundColor: color + '22',
            borderWidth: 2.5,
            tension: 0.25,
            fill: true,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: { display: false },
        },
        scales: {
          y: {
            beginAtZero: field === 'growth' ? true : undefined,
            ticks: {
              callback: function (v) {
                return ySuffix ? `${v}${ySuffix}` : v;
              },
            },
          },
        },
      },
    });
  }

  function renderGrowthBar(canvasId, history) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById(canvasId);
    if (!canvas || !history.length) return;

    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: historyLabels(history),
        datasets: [
          {
            data: history.map((p) => p.growth),
            backgroundColor: history.map((p) => (p.growth >= 0 ? '#1f8a4c' : '#c0392b')),
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, datalabels: { display: false } },
      },
    });
  }

  function renderCharts(history) {
    requestAnimationFrame(function () {
      renderLineChart('moProfChartPercent', history, 'percent', '#1f6392', '%');
      renderLineChart('moProfChartFact', history, 'fact', '#2c7da0', '');
      renderLineChart('moProfChartCoverage', history, 'coverage', '#0d9488', '%');
      renderGrowthBar('moProfChartGrowth', history);
    });
  }

  function scrollToMoInTable(moName) {
    close();
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    const key = normalizeMoKey(moName);
    const rows = tbody.querySelectorAll('tr.mo-row-clickable');
    rows.forEach(function (row) {
      row.classList.remove('mo-row-highlight');
      const rowName = row.getAttribute('data-mo-name');
      if (rowName && normalizeMoKey(rowName) === key) {
        row.classList.add('mo-row-highlight');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function () {
          row.classList.remove('mo-row-highlight');
        }, 3000);
      }
    });
  }

  function renderProfile(moName, history, meta) {
    const mo = currentMos.find((m) => normalizeMoKey(m.name) === normalizeMoKey(moName));
    if (!mo) {
      showError('МО не найдена в текущем отчёте');
      return;
    }

    const rankings = computeMoRankings(moName, currentMos);
    const lastPeriod = history.length ? formatPeriodLabel(history[history.length - 1].period) : '';

    const content = document.getElementById('moProfileContent');
    if (!content) return;

    content.innerHTML = `
      <header class="mo-profile-header">
        <h2 id="moProfileTitle">${escapeHtml(mo.name)}</h2>
        <div class="mo-profile-header-meta">
          ${escapeHtml(lastPeriod)} · ${meta.matchedReports} из ${meta.totalReports} архивных отчётов
        </div>
        ${renderRankBadges(rankings)}
      </header>
      ${renderKpiStrip(mo, rankings)}
      ${renderChartCards()}
      ${renderHistoryTable(history)}
      <div class="mo-profile-footer-actions">
        <button type="button" class="mo-profile-link-btn" id="moProfileScrollToRow">
          ${icon('table-2')} Открыть в таблице
        </button>
      </div>
    `;

    const scrollBtn = document.getElementById('moProfileScrollToRow');
    if (scrollBtn) {
      scrollBtn.addEventListener('click', function () {
        scrollToMoInTable(moName);
      });
    }

    renderCharts(history);
  }

  function fetchHistory(moName) {
    if (!gasAdapter) {
      return Promise.resolve({ points: [], meta: { totalReports: 0, matchedReports: 0, moName } });
    }
    return gasAdapter.call('getMoHistoryFromArchive', { params: [moName] });
  }

  function open(moName) {
    if (!moName) return;

    showOverlay();
    showLoading();

    fetchHistory(moName)
      .then(function (result) {
        const mo = currentMos.find((m) => normalizeMoKey(m.name) === normalizeMoKey(moName));
        let history = (result && result.points) || [];
        history = mergeCurrentPoint(history, mo);
        const meta = (result && result.meta) || {
          totalReports: history.length,
          matchedReports: history.length,
          moName: moName,
        };
        renderProfile(moName, history, meta);
      })
      .catch(function (err) {
        showError(err.message || 'Не удалось загрузить историю МО');
      });
  }

  function setupUi() {
    const closeBtn = document.getElementById('moProfileClose');
    const overlay = document.getElementById('moProfileOverlay');

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close();
      });
    }
  }

  function init(options) {
    gasAdapter = (options && options.gasAdapter) || null;
    if (!initialized) {
      setupUi();
      initialized = true;
    }
  }

  return {
    init,
    setCurrentMos,
    setCurrentReportId,
    open,
    close,
  };
})();

window.MoProfile = MoProfile;
