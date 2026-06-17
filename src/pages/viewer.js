/**
 * =============================================================================
 * viewer.js — логика режима ПРОСМОТРА (Viewer.html)
 * =============================================================================
 *
 * URL: ?viewer=1  или  ?viewer=1&id=<ID>
 * Старт: getArchiveBootstrap — список архива + отчёт одним запросом.
 * Кэш: localStorage VIEWER_CACHE_KEY.
 * =============================================================================
 */
import { renderHtmlContent, escapeHtml, formatShortDate, getNextWeekPeriod, icon } from '../lib/index.js';
import { makeTrendChart, makePlanFactChart } from '../lib/charts.js';
import { GoogleAppsScriptAdapter } from '../core/GoogleAppsScriptAdapter.js';
import {
  initBundleLoader,
  waitForChart,
  ensureChartDataLabels,
  ensureDashboardPhase2,
  ensureEcharts,
  setMoProfileContext,
} from '../core/bundleLoader.js';

(function () {
  const gasAdapter = new GoogleAppsScriptAdapter(CONFIG.api || {});

  const VIEWER_CACHE_KEY = 'knsk_viewer_report_v1';
    const PLAN_WEEKLY = CONFIG.plans.weekly;
    let dynamicChart = null;
    let planFactChart = null;
    let reportsList = [];
    let chartsReady = false;
    // Алиас для совместимости с вызовами formatDate внутри файла.
    const formatDate = formatShortDate;

    function whenChartsReady(fn) {
        waitForChart()
            .then(function () {
                return ensureChartDataLabels();
            })
            .then(function () {
                if (!chartsReady) chartsReady = true;
                fn();
            })
            .catch(function (err) {
                console.error(err);
            });
    }

    function getWeekRangeFromReportDate(reportDateStr) {
        if (!reportDateStr) return 'Дата не указана';
        const match = reportDateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (!match) {
            console.warn('Не удалось распарсить дату (нет dd.mm.yyyy):', reportDateStr);
            return reportDateStr;
        }
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        const reportDate = new Date(year, month - 1, day);
        if (isNaN(reportDate.getTime())) {
            console.warn('Некорректная дата после парсинга:', reportDateStr);
            return reportDateStr;
        }
        
        const dayOfWeek = reportDate.getDay();
        let daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        const monday = new Date(reportDate);
        monday.setDate(reportDate.getDate() - daysToMonday);
        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);
        
        const format = d => `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}`;
        return `${format(monday)} – ${format(friday)}`;
    }
    
  function updateTrendGraph(weeksArray) {
    const weeks = (weeksArray || []).map((w) => ({
      period: `${formatDate(w.start)}-${formatDate(w.end)}`,
      value: w.value,
    }));
    dynamicChart = makeTrendChart({
      canvasId: 'trendChart',
      weeks: weeks,
      planWeekly: PLAN_WEEKLY,
      emptyMessage: 'Нет данных о неделях',
      noteId: 'trendNote',
      previous: dynamicChart,
    });
  }

  function updatePlanFactChart(totalGrowth) {
    planFactChart = makePlanFactChart({
      canvasId: 'planFactChart',
      growth: totalGrowth,
      planWeekly: PLAN_WEEKLY,
      categoryPercentage: 0.8,
      noteId: 'planFactNote',
      previous: planFactChart,
    });
  }
    
    function resolvePreviousContext(previous) {
        if (!previous || !window.DashboardPhase1) {
            return { previousTotals: null, previousMos: null };
        }
        return {
            previousTotals: DashboardPhase1.computeTotalsFromMosData(previous.mosData),
            previousMos: DashboardPhase1.buildMosFromData(previous.mosData)
        };
    }

    function populateArchiveSelect(list, selectedId) {
        const select = document.getElementById('archiveSelect');
        if (!select) return;
        select.innerHTML = '<option value="">— Выберите отчёт (доступно ' + list.length + ') —</option>';
        list.forEach(function (item) {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.dateStr || ('Отчёт #' + item.id);
            select.appendChild(option);
        });
        if (selectedId) select.value = String(selectedId);
    }

    function loadViewerCache() {
        try {
            var raw = localStorage.getItem(VIEWER_CACHE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_e) {
            return null;
        }
    }

    function saveViewerCache(reportId, report, previous) {
        try {
            localStorage.setItem(VIEWER_CACHE_KEY, JSON.stringify({
                reportId: reportId,
                report: report,
                previous: previous,
                savedAt: Date.now()
            }));
        } catch (_e) {}
    }

    function applyReportToDashboard(report, previousTotals, previousMos, reportId) {
        if (!report || !window.DashboardPhase1) return Promise.resolve(null);

        if (!report.timestamp) {
            report.timestamp = new Date().toLocaleDateString('ru-RU');
        }

        const timestamp = report.timestamp;
        const periodText = report.period || 'Период не указан';
        const nextWeek = getNextWeekPeriod();
        const currentWeekRange = getWeekRangeFromReportDate(timestamp);

        const periodEl = document.getElementById('periodDisplayText');
        if (periodEl) periodEl.textContent = periodText;

        const doneDisplay = document.getElementById('doneTextDisplay');
        if (doneDisplay) doneDisplay.innerHTML = renderHtmlContent(report.doneText);
        const plansDisplay = document.getElementById('plansTextDisplay');
        if (plansDisplay) plansDisplay.innerHTML = renderHtmlContent(report.plansText);
        const doneDate = document.getElementById('doneDateDisplay');
        if (doneDate) doneDate.innerHTML = icon('calendar') + ' Отчётная неделя: ' + escapeHtml(currentWeekRange);
        const plansDate = document.getElementById('plansDateDisplay');
        if (plansDate) plansDate.innerHTML = icon('calendar') + ' ' + escapeHtml(timestamp);
        const nextWeekEl = document.getElementById('nextWeekPeriodDisplay');
        if (nextWeekEl) nextWeekEl.textContent = nextWeek.display;
        const normalized = DashboardPhase1.normalizeArchiveReport(report);
        const mosData = normalized ? normalized.mosData : report.mosData;

        if (!mosData || !mosData.length) {
            document.getElementById('tableBody').innerHTML = '<tr><td colspan="10">Нет данных МО в архиве</td></tr>';
            return Promise.resolve(null);
        }

        const mos = DashboardPhase1.buildMosFromData(mosData);
        if (!mos.length) {
            document.getElementById('tableBody').innerHTML = '<tr><td colspan="10">Не удалось разобрать данные МО</td></tr>';
            return Promise.resolve(null);
        }

        DashboardPhase1.resetTableSearchBinding();
        if (window.DashboardPhase2) DashboardPhase2.resetTableClickBinding();

        return DashboardPhase1.renderAll(mosData, {
            mos: mos,
            previousTotals: previousTotals || null,
            previousMos: previousMos || null,
        }).then(function (result) {
            whenChartsReady(function () {
                updatePlanFactChart(result.totals ? result.totals.growth : 0);
                updateTrendGraph(report.weeksData || []);
            });
            if (window.DashboardPhase2) {
                DashboardPhase2.renderAll(mos, {
                    totals: result.totals,
                    previousMos: previousMos || null,
                });
            }
            setMoProfileContext(mos, reportId || null);
            return result;
        });
    }
    
  window.addEventListener('DOMContentLoaded', function () {
        initBundleLoader(gasAdapter);

        const container = document.getElementById('dashboardContainer');
        const initialIdRaw = container && container.getAttribute('data-initial-report-id');
        const initialId = initialIdRaw ? parseInt(initialIdRaw, 10) : null;

        Promise.all([waitForChart(), ensureDashboardPhase2()])
            .then(function () {
                if (window.DashboardPhase2) {
                    DashboardPhase2.init({
                        onStatus: function (msg, ok) {
                            if (!ok) console.error(msg);
                            else if (window.__KNSK_DEBUG) console.log(msg);
                        },
                        gasAdapter: gasAdapter,
                    });
                }
                ensureEcharts().catch(function (err) {
                    console.warn('ECharts preload:', err);
                });

                if (window.DashboardPhase1) DashboardPhase1.showLoadingState();

                const cached = loadViewerCache();
                if (cached && cached.report && (!initialId || cached.reportId === initialId)) {
                    const ctx = resolvePreviousContext(cached.previous);
                    applyReportToDashboard(cached.report, ctx.previousTotals, ctx.previousMos, cached.reportId);
                }

                return gasAdapter.call('getArchiveBootstrap', { params: [initialId || null] });
            })
            .then(function (data) {
                if (!data) return;
                reportsList = (data && data.list) || [];
                window.archiveReportsList = reportsList;

                if (!reportsList.length) {
                    document.getElementById('signalsList').innerHTML =
                        '<li>Нет сохранённых отчётов в архиве</li>';
                    return;
                }

                populateArchiveSelect(reportsList, data.reportId);
                if (window.DashboardPhase2) {
                    DashboardPhase2.populateCompareSelects(reportsList, null);
                }

                if (data && data.report) {
                    const prevCtx = resolvePreviousContext(data.previous);
                    applyReportToDashboard(
                        data.report,
                        prevCtx.previousTotals,
                        prevCtx.previousMos,
                        data.reportId
                    );
                    saveViewerCache(data.reportId, data.report, data.previous);
                    if (window.DashboardPhase2 && DashboardPhase2.cacheArchiveReport) {
                        DashboardPhase2.cacheArchiveReport(data.reportId, data.report);
                        if (data.previous && window.DashboardPhase1 && DashboardPhase1.getPreviousArchiveId) {
                            var bootstrapPrevId = DashboardPhase1.getPreviousArchiveId(
                                window.archiveReportsList || reportsList,
                                data.reportId
                            );
                            if (bootstrapPrevId) {
                                DashboardPhase2.cacheArchiveReport(bootstrapPrevId, data.previous);
                            }
                        }
                    }
                }
            })
            .catch(function (err) {
                if (window.DashboardPhase1) DashboardPhase1.hideLoadingState();
                document.getElementById('signalsList').innerHTML =
                    '<li>Ошибка загрузки: ' + escapeHtml(err.message || String(err)) + '</li>';
                console.error('Ошибка инициализации viewer:', err);
            });

        document.getElementById('archiveSelect').addEventListener('change', function () {
            const selectedId = this.value;
            if (selectedId && selectedId !== '') {
                loadReportById(selectedId);
            }
        });
  });

  function loadReportById(id) {
    if (!id || id === '') return;

    if (window.DashboardPhase1) DashboardPhase1.showLoadingState();

    gasAdapter
      .call('getArchivedReportWithPrevious', { params: [parseInt(id, 10)] })
      .then(function (payload) {
        const report = payload && payload.report;
        if (!report) return;

        const prevCtx = resolvePreviousContext(payload.previous);
        applyReportToDashboard(report, prevCtx.previousTotals, prevCtx.previousMos, parseInt(id, 10));
        saveViewerCache(parseInt(id, 10), report, payload.previous);
        if (window.DashboardPhase2 && DashboardPhase2.cacheArchiveReport) {
          DashboardPhase2.cacheArchiveReport(parseInt(id, 10), report);
          if (payload.previous && window.DashboardPhase1 && DashboardPhase1.getPreviousArchiveId) {
            var prevId = DashboardPhase1.getPreviousArchiveId(window.archiveReportsList, parseInt(id, 10));
            if (prevId) DashboardPhase2.cacheArchiveReport(prevId, payload.previous);
          }
        }
      })
      .catch(function (err) {
        if (window.DashboardPhase1) DashboardPhase1.hideLoadingState();
        document.getElementById('signalsList').innerHTML =
          '<li>Ошибка загрузки отчёта: ' + escapeHtml(err.message || String(err)) + '</li>';
        console.error('Ошибка загрузки отчёта:', err);
      });
  }
})();
