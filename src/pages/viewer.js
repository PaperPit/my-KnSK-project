/**
 * =============================================================================
 * viewer.js — логика режима ПРОСМОТРА (Viewer.html)
 * =============================================================================
 *
 * URL: ?viewer=1  или  ?viewer=1&id=<ID>
 * Старт: getArchiveBootstrap — список, отчёт, previous и weeksTrend одним вызовом.
 * Кэш: localStorage VIEWER_CACHE_KEY.
 * =============================================================================
 */
import { renderHtmlContent, escapeHtml, formatShortDate, getNextWeekPeriod, icon } from '../lib/index.js';
import { makeTrendChart, makePlanFactChart } from '../lib/charts.js';
import {
  mergeReportDynamicsWeek,
  DEFAULT_WEEKLY_DYNAMICS_LIMIT,
} from '../lib/weeklyDynamics.js';
import {
  fetchWeeksTrend,
  getWeeksTrendCache,
  setWeeksTrendCache,
} from '../lib/weeksTrendCache.js';
import { openChartDiagnostics } from '../core/chartDiagnostics.js';
import { perfMark } from '../core/perfTracker.js';
import { GoogleAppsScriptAdapter } from '../core/GoogleAppsScriptAdapter.js';
import {
  initBundleLoader,
  ensureChartsReadyLocal,
  ensurePhase2Initialized,
  schedulePhase2Idle,
  setMoProfileContext,
} from '../core/bundleLoader.js';

(function () {
  const gasAdapter = new GoogleAppsScriptAdapter(CONFIG.api || {});
  initBundleLoader(gasAdapter);

  const VIEWER_CACHE_KEY = 'knsk_viewer_report_v1';
    const PLAN_WEEKLY = CONFIG.plans.weekly;
    let dynamicChart = null;
    let planFactChart = null;
    let reportsList = [];
    let chartsReady = false;
    let chartsReadyPromise = null;
    let pendingPhase2Render = null;
    let phase2Options = null;
    // Алиас для совместимости с вызовами formatDate внутри файла.
    const formatDate = formatShortDate;

    function getPhase2Options() {
        if (!phase2Options) {
            phase2Options = {
                onStatus: function (msg, ok) {
                    if (!ok) console.error(msg);
                    else if (window.__KNSK_DEBUG) console.log(msg);
                },
                gasAdapter: gasAdapter,
            };
        }
        return phase2Options;
    }

    function flushPendingPhase2(reportIdForCompare) {
        if (!window.DashboardPhase2 || !pendingPhase2Render) return;
        const ctx = pendingPhase2Render;
        DashboardPhase2.populateCompareSelects(reportsList, reportIdForCompare != null ? reportIdForCompare : ctx.reportId);
        DashboardPhase2.renderAll(ctx.mos, {
            totals: ctx.totals,
            previousMos: ctx.previousMos || null,
        });
        if (DashboardPhase2.cacheArchiveReport && ctx.reportId) {
            DashboardPhase2.cacheArchiveReport(ctx.reportId, ctx.report);
            if (ctx.previousReport && ctx.previousId) {
                DashboardPhase2.cacheArchiveReport(ctx.previousId, ctx.previousReport);
            }
        }
        pendingPhase2Render = null;
    }

    function scheduleViewerPhase2Idle(reportIdForCompare) {
        const opts = getPhase2Options();
        schedulePhase2Idle({
            onStatus: opts.onStatus,
            gasAdapter: opts.gasAdapter,
            onReady: function () {
                flushPendingPhase2(reportIdForCompare);
            },
        });
    }

    function bindPhase2InteractionTriggers() {
        function warmPhase2() {
            ensurePhase2Initialized(getPhase2Options())
                .then(function () {
                    flushPendingPhase2(null);
                })
                .catch(function (err) {
                    console.warn('[Phase2 interaction]', err);
                });
        }

        ['compareReportsBtn', 'presentationModeBtn'].forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', warmPhase2, { once: true, capture: true });
        });

        const tableBody = document.getElementById('tableBody');
        if (tableBody) {
            tableBody.addEventListener(
                'click',
                function (e) {
                    if (!e.target.closest('tr.mo-row-clickable')) return;
                    warmPhase2();
                },
                { once: true, capture: true }
            );
        }
    }

    function ensureChartsReady() {
        if (chartsReady) return Promise.resolve();
        if (chartsReadyPromise) return chartsReadyPromise;
        chartsReadyPromise = ensureChartsReadyLocal()
            .then(function () {
                chartsReady = true;
            })
            .catch(function (err) {
                chartsReadyPromise = null;
                console.error(err);
                throw err;
            });
        return chartsReadyPromise;
    }

    function renderDashboardCharts(totalsGrowth, weeksArray) {
        ensureChartsReady().then(function () {
            requestAnimationFrame(function () {
                updatePlanFactChart(totalsGrowth || 0);
                updateTrendGraph(weeksArray);
            });
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
      emptyMessage: 'Нет данных по неделям из архива',
      noteId: 'trendNote',
      previous: dynamicChart,
    });
  }

  function mergeWeeksTrendForReport(mosData, reportAnchor, weeksTrend) {
    const weeks = weeksTrend || getWeeksTrendCache() || [];
    if (weeks.length) {
      return Promise.resolve(mergeReportDynamicsWeek(weeks, mosData, reportAnchor));
    }
    const limit =
      (CONFIG && CONFIG.ui && CONFIG.ui.weeklyDynamicsLimit) || DEFAULT_WEEKLY_DYNAMICS_LIMIT;
    return fetchWeeksTrend(gasAdapter, limit).then(function (fetched) {
      return mergeReportDynamicsWeek(fetched || [], mosData, reportAnchor);
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

    function applyReportToDashboard(report, previousTotals, previousMos, reportId, weeksTrend) {
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

        return ensureChartsReadyLocal().then(function () {
        return DashboardPhase1.renderAll(mosData, {
            mos: mos,
            previousTotals: previousTotals || null,
            previousMos: previousMos || null,
        }).then(function (result) {
            const reportAnchor = report.timestamp || null;
            return mergeWeeksTrendForReport(mosData, reportAnchor, weeksTrend).then(function (merged) {
              renderDashboardCharts(result.totals ? result.totals.growth : 0, merged);
            pendingPhase2Render = {
                mos: mos,
                totals: result.totals,
                previousMos: previousMos || null,
                reportId: reportId || null,
                report: report,
            };
            if (window.DashboardPhase2) {
                DashboardPhase2.renderAll(mos, {
                    totals: result.totals,
                    previousMos: previousMos || null,
                });
                pendingPhase2Render = null;
            }
            setMoProfileContext(mos, reportId || null);
            perfMark('trend-charts-painted');
            perfMark('report-applied', 'id=' + (reportId || ''));
            return result;
            });
        });
        });
    }
    
  window.addEventListener('DOMContentLoaded', function () {
        perfMark('dom-content-loaded');
        ensureChartsReady();
        bindPhase2InteractionTriggers();

        const container = document.getElementById('dashboardContainer');
        const initialIdRaw = container && container.getAttribute('data-initial-report-id');
        const initialId = initialIdRaw ? parseInt(initialIdRaw, 10) : null;

        if (window.DashboardPhase1) DashboardPhase1.showLoadingState();

        perfMark('bootstrap-start');
        gasAdapter
            .call('getArchiveBootstrap', { params: [initialId || null] })
            .then(function (data) {
                perfMark('bootstrap-end', data && data.list ? 'reports=' + data.list.length : '');
                if (!data) return;
                reportsList = (data && data.list) || [];
                window.archiveReportsList = reportsList;

                if (!reportsList.length) {
                    document.getElementById('signalsList').innerHTML =
                        '<li>Нет сохранённых отчётов в архиве</li>';
                    return;
                }

                populateArchiveSelect(reportsList, data.reportId);

                if (data && data.report) {
                    if (data.weeksTrend) setWeeksTrendCache(data.weeksTrend);
                    const prevCtx = resolvePreviousContext(data.previous);
                    let previousId = null;
                    if (data.previous && window.DashboardPhase1 && DashboardPhase1.getPreviousArchiveId) {
                        previousId = DashboardPhase1.getPreviousArchiveId(
                            window.archiveReportsList || reportsList,
                            data.reportId
                        );
                    }
                    applyReportToDashboard(
                        data.report,
                        prevCtx.previousTotals,
                        prevCtx.previousMos,
                        data.reportId,
                        data.weeksTrend
                    ).then(function () {
                        if (pendingPhase2Render) {
                            pendingPhase2Render.previousReport = data.previous || null;
                            pendingPhase2Render.previousId = previousId;
                        }
                        scheduleViewerPhase2Idle(data.reportId);
                    });
                    saveViewerCache(data.reportId, data.report, data.previous);
                    if (window.DashboardPhase2 && DashboardPhase2.cacheArchiveReport) {
                        DashboardPhase2.cacheArchiveReport(data.reportId, data.report);
                        if (data.previous && previousId) {
                            DashboardPhase2.cacheArchiveReport(previousId, data.previous);
                        }
                    }
                } else {
                    scheduleViewerPhase2Idle(null);
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

        const diagBtn = document.getElementById('chartDiagnosticsBtn');
        if (diagBtn) {
            diagBtn.addEventListener('click', function () {
                openChartDiagnostics({
                    gasAdapter: gasAdapter,
                    onStatus: function (msg, ok) {
                        if (!ok) console.error('[diag]', msg);
                        else console.log('[diag]', msg);
                    },
                });
            });
        }
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
        const reportId = parseInt(id, 10);
        if (payload.weeksTrend) setWeeksTrendCache(payload.weeksTrend);
        let previousId = null;
        if (payload.previous && window.DashboardPhase1 && DashboardPhase1.getPreviousArchiveId) {
          previousId = DashboardPhase1.getPreviousArchiveId(window.archiveReportsList, reportId);
        }
        applyReportToDashboard(
          report,
          prevCtx.previousTotals,
          prevCtx.previousMos,
          reportId,
          payload.weeksTrend
        ).then(function () {
          if (pendingPhase2Render) {
            pendingPhase2Render.previousReport = payload.previous || null;
            pendingPhase2Render.previousId = previousId;
          }
          scheduleViewerPhase2Idle(reportId);
        });
        saveViewerCache(reportId, report, payload.previous);
        if (window.DashboardPhase2 && DashboardPhase2.cacheArchiveReport) {
          DashboardPhase2.cacheArchiveReport(reportId, report);
          if (payload.previous && previousId) {
            DashboardPhase2.cacheArchiveReport(previousId, payload.previous);
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
