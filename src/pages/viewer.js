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
(function () {
  const L = window.KnSKLib;
  const renderHtmlContent = L.renderHtmlContent;
  const escapeHtml = L.escapeHtml;
  const gasAdapter = new GoogleAppsScriptAdapter(CONFIG.api || {});

  const VIEWER_CACHE_KEY = 'knsk_viewer_report_v1';
    const PLAN_WEEKLY = CONFIG.plans.weekly;
    let dynamicChart = null;
    let planFactChart = null;
    let reportsList = [];
    let chartsReady = false;

    function whenChartsReady(fn) {
        if (typeof Chart !== 'undefined' && ChartDataLabels) {
            if (!chartsReady) {
                Chart.register(ChartDataLabels);
                chartsReady = true;
            }
            fn();
            return;
        }
        var attempts = 0;
        var timer = setInterval(function () {
            attempts += 1;
            if (typeof Chart !== 'undefined' && ChartDataLabels) {
                clearInterval(timer);
                Chart.register(ChartDataLabels);
                chartsReady = true;
                fn();
            } else if (attempts > 200) {
                clearInterval(timer);
                console.error('Chart.js не загрузился');
            }
        }, 25);
    }
    
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}`;
    }
    
    function getNextWeekPeriod() {
        const today = new Date();
        let nextMonday = new Date(today);
        const day = today.getDay();
        let daysUntilMonday = (day === 0 ? 1 : 8 - day);
        if (day === 1) daysUntilMonday = 0;
        nextMonday.setDate(today.getDate() + daysUntilMonday);
        let nextFriday = new Date(nextMonday);
        nextFriday.setDate(nextMonday.getDate() + 4);
        const format = d => `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}`;
        return { display: `${format(nextMonday)} - ${format(nextFriday)}` };
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
    if (!weeksArray || !weeksArray.length) {
      const trendNote = document.getElementById('trendNote');
      if (trendNote) trendNote.innerHTML = 'Нет данных о неделях';
      if (dynamicChart) dynamicChart.destroy();
      return;
    }
    const weeks = weeksArray.map((w) => ({
      period: `${formatDate(w.start)}-${formatDate(w.end)}`,
      value: w.value,
    }));
    const labels = weeks.map((w) => w.period);
    const factValues = weeks.map((w) => w.value);
    const planLine = new Array(weeks.length).fill(PLAN_WEEKLY);
    const ctx = document.getElementById('trendChart').getContext('2d');
    if (dynamicChart) dynamicChart.destroy();
    dynamicChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Факт КнСК',
            data: factValues,
            borderColor: '#1f6392',
            borderWidth: 3,
            tension: 0.2,
            fill: false,
            pointRadius: 6,
          },
          {
            label: 'План',
            data: planLine,
            borderColor: '#e67e22',
            borderWidth: 2.5,
            borderDash: [8, 6],
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          datalabels: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()} иссл.`,
            },
          },
        },
      },
    });
    const trendNote = document.getElementById('trendNote');
    if (trendNote) {
      trendNote.innerHTML = `* Последняя точка: ${weeks[weeks.length - 1].period} — <strong>${factValues[factValues.length - 1].toLocaleString()}</strong> (план ~${PLAN_WEEKLY.toLocaleString()})`;
    }
  }

  function updatePlanFactChart(totalGrowth) {
        const ctx = document.getElementById('planFactChart').getContext('2d');
        if (planFactChart) planFactChart.destroy();
        planFactChart = new Chart(ctx, {
            type: 'bar', 
            data: { 
                labels: ['Недельный план', 'Факт'], 
                datasets: [{ 
                    label: 'Исследования КнСК', 
                    data: [PLAN_WEEKLY, totalGrowth || 0], 
                    backgroundColor: ['#2c7da0', '#e9b35f'], 
                    borderRadius: 12,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8
                }] 
            }, 
            options: { 
                responsive: true, 
                maintainAspectRatio: true,
                plugins: {
                    datalabels: {
                        display: true,
                        color: '#1e293b',
                        anchor: 'center',
                        align: 'center',
                        font: { size: 14, weight: 'bold' },
                        formatter: (value) => value.toLocaleString()
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        title: { display: true, text: 'Количество исследований' },
                        ticks: { callback: (value) => value.toLocaleString() }
                    }
                }
            }
        });
        const percent = totalGrowth ? (totalGrowth / PLAN_WEEKLY * 100).toFixed(1) : 0;
        const planFactNote = document.getElementById('planFactNote');
        if (planFactNote) {
            planFactNote.innerHTML = `⚠️ <strong>${percent}% выполнения недельного плана</strong>`;
        }
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

    function applyReportToDashboard(report, previousTotals, previousMos) {
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
        if (doneDate) doneDate.innerHTML = '<i class="far fa-calendar-alt"></i> Отчётная неделя: ' + escapeHtml(currentWeekRange);
        const plansDate = document.getElementById('plansDateDisplay');
        if (plansDate) plansDate.innerHTML = '<i class="far fa-calendar-alt"></i> ' + escapeHtml(timestamp);
        const nextWeekEl = document.getElementById('nextWeekPeriodDisplay');
        if (nextWeekEl) nextWeekEl.textContent = nextWeek.display;
        const reportDateEl = document.getElementById('reportDate');
        if (reportDateEl) reportDateEl.textContent = timestamp;

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
            return result;
        });
    }
    
  function initViewer() {
        const container = document.getElementById('dashboardContainer');
        const initialIdRaw = container && container.getAttribute('data-initial-report-id');
        const initialId = initialIdRaw ? parseInt(initialIdRaw, 10) : null;

        if (window.DashboardPhase1) DashboardPhase1.showLoadingState();

        const cached = loadViewerCache();
        if (cached && cached.report && (!initialId || cached.reportId === initialId)) {
            const ctx = resolvePreviousContext(cached.previous);
            applyReportToDashboard(cached.report, ctx.previousTotals, ctx.previousMos);
        }

    gasAdapter
      .call('getArchiveBootstrap', { params: [initialId || null] })
      .then(function (data) {
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
          applyReportToDashboard(data.report, prevCtx.previousTotals, prevCtx.previousMos);
          saveViewerCache(data.reportId, data.report, data.previous);
          if (window.DashboardPhase2 && DashboardPhase2.cacheArchiveReport) {
            DashboardPhase2.cacheArchiveReport(data.reportId, data.report);
            if (data.previous && window.DashboardPhase1 && DashboardPhase1.getPreviousArchiveId) {
              var bootstrapPrevId = DashboardPhase1.getPreviousArchiveId(
                window.archiveReportsList || reportsList,
                data.reportId
              );
              if (bootstrapPrevId) DashboardPhase2.cacheArchiveReport(bootstrapPrevId, data.previous);
            }
          }
        }
      })
      .catch(function (err) {
        if (window.DashboardPhase1) DashboardPhase1.hideLoadingState();
        document.getElementById('signalsList').innerHTML =
          '<li>Ошибка загрузки: ' + escapeHtml(err.message || String(err)) + '</li>';
        console.error('Ошибка bootstrap:', err);
      });
  }

  function loadReportById(id) {
    if (!id || id === '') return;

    if (window.DashboardPhase1) DashboardPhase1.showLoadingState();

    gasAdapter
      .call('getArchivedReportWithPrevious', { params: [parseInt(id, 10)] })
      .then(function (payload) {
        const report = payload && payload.report;
        if (!report) return;

        const prevCtx = resolvePreviousContext(payload.previous);
        applyReportToDashboard(report, prevCtx.previousTotals, prevCtx.previousMos);
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

  window.addEventListener('DOMContentLoaded', function () {
        whenChartsReady(function () {
            if (window.DashboardPhase2) {
                DashboardPhase2.init({
                    onStatus: function (msg) { console.log(msg); }
                });
            }
            initViewer();

            document.getElementById('archiveSelect').addEventListener('change', function () {
                const selectedId = this.value;
                if (selectedId && selectedId !== '') {
                    loadReportById(selectedId);
                }
            });
        });
  });
})();
