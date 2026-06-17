/**
 * =============================================================================
 * editor.js — логика режима РЕДАКТОРА (Index.html)
 * =============================================================================
 *
 * ПОДКЛЮЧЕНИЕ: Index.html → <?!= include('EditorPage'); ?>
 * СБОРКА: npm run build → EditorPage.html
 *
 * ОТВЕТСТВЕННОСТЬ:
 *   - Загрузка CSV, недельная динамика, текстовые блоки
 *   - Архив: сохранение/загрузка через gasAdapter
 *   - Экспорт HTML, кнопка «Веб-версия»
 *
 * KPI и таблица — DashboardPhase1/2 (через window). Математика — KnSKLib.
 * =============================================================================
 */
import { renderHtmlContent, parseCSV, formatShortDate, getNextWeekPeriod, icon } from '../lib/index.js';
import {
  initBundleLoader,
  waitForChart,
  ensureDashboardPhase2,
  ensureEcharts,
  setMoProfileContext,
} from '../core/bundleLoader.js';
import { makeTrendChart, makePlanFactChart } from '../lib/charts.js';
import { GoogleAppsScriptAdapter } from '../core/GoogleAppsScriptAdapter.js';

(function () {
  const gasAdapter = new GoogleAppsScriptAdapter(CONFIG.api || {});

  if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined' && !Chart.registry.getPlugin('datalabels')) {
    Chart.register(ChartDataLabels);
  }

  let currentMOSData = [];
    let weeksData = [];
    let archiveReportsList = [];
    let nextId = 1;
    const PLAN_WEEKLY = CONFIG.plans.weekly;
    let dynamicChart = null;
    let planFactChart = null;
    // Алиас для совместимости с вызовами formatDate внутри файла.
    const formatDate = formatShortDate;
    
    // ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
    function getTextareaSelection(textareaId) {
        const textarea = document.getElementById(textareaId);
        return { textarea, start: textarea.selectionStart, end: textarea.selectionEnd, selectedText: textarea.value.substring(textarea.selectionStart, textarea.selectionEnd) };
    }
    
    function wrapWithLink(textareaId) {
        const { textarea, start, end, selectedText } = getTextareaSelection(textareaId);
        if (!selectedText) { alert('Выделите текст'); return; }
        const url = prompt('URL:', 'https://');
        if (!url) return;
        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(end);
        textarea.value = before + `<a href="${url}" target="_blank">${selectedText}</a>` + after;
        syncTextsToDashboard();
        textarea.focus();
        textarea.setSelectionRange(before.length + `<a href="${url}" target="_blank">${selectedText}</a>`.length, before.length + `<a href="${url}" target="_blank">${selectedText}</a>`.length);
    }
    
    function wrapWithBold(textareaId) {
        const { textarea, start, end, selectedText } = getTextareaSelection(textareaId);
        if (!selectedText) { alert('Выделите текст'); return; }
        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(end);
        textarea.value = before + `<strong>${selectedText}</strong>` + after;
        syncTextsToDashboard();
        textarea.focus();
        textarea.setSelectionRange(before.length + `<strong>${selectedText}</strong>`.length, before.length + `<strong>${selectedText}</strong>`.length);
    }
    
    function insertListItem(textareaId) {
        const { textarea, start, end } = getTextareaSelection(textareaId);
        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(end);
        textarea.value = before + `\n• ` + after;
        syncTextsToDashboard();
        textarea.focus();
        textarea.setSelectionRange(before.length + 3, before.length + 3);
    }
    
  function syncTextsToDashboard() {
        const doneRaw = document.getElementById('doneTextInput').value;
        const plansRaw = document.getElementById('plansTextInput').value;
        const currentDate = new Date().toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        document.getElementById('doneTextDisplay').innerHTML = renderHtmlContent(doneRaw);
        document.getElementById('plansTextDisplay').innerHTML = renderHtmlContent(plansRaw);
        document.getElementById('doneDateDisplay').innerHTML = `${icon('calendar')} ${currentDate}`;
        document.getElementById('plansDateDisplay').innerHTML = `${icon('calendar')} ${currentDate}`;
    }
    
    function syncPeriodToDashboard() {
        const period = document.getElementById('periodInput').value.trim();
        document.getElementById('periodDisplayText').innerHTML = period || 'Период не указан';
    }

    function updateNextWeekPeriodDisplay() {
        document.getElementById('nextWeekPeriodDisplay').innerHTML = getNextWeekPeriod().display;
    }
    
    function addWeek() {
        const s = document.getElementById('startDate');
        const e = document.getElementById('endDate');
        if (!s.value || !e.value) { alert('Выберите даты'); return; }
        weeksData.push({ id: nextId++, start: s.value, end: e.value, value: 0 });
        renderWeeksInput();
    }
    
    function removeWeek(id) {
        weeksData = weeksData.filter(w => w.id !== id);
        renderWeeksInput();
    }
    
    function updateWeekValue(id, val) {
        const w = weeksData.find(w => w.id === id);
        if (w) w.value = parseInt(val) || 0;
    }
    
    function renderWeeksInput() {
        const container = document.getElementById('weeksContainer');
        if (!weeksData.length) {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:#6c7a91;">Нет недель. Нажмите "Добавить неделю"</div>';
            return;
        }
        container.innerHTML = '';
        weeksData.forEach(w => {
            const div = document.createElement('div');
            div.className = 'week-card';
            div.innerHTML = `
                <div class="week-period-display">${icon('calendar')} ${formatDate(w.start)} - ${formatDate(w.end)}</div>
                <label>🔬 Количество исследований</label>
                <input type="number" class="week-value-input" value="${w.value}" step="100">
                <button class="btn-remove-week" data-id="${w.id}">${icon('trash-2')} Удалить</button>
            `;
            container.appendChild(div);
            div.querySelector('.week-value-input').addEventListener('change', (e) => updateWeekValue(w.id, e.target.value));
            div.querySelector('.btn-remove-week').addEventListener('click', () => removeWeek(w.id));
        });
    }
    
    function getCurrentWeeksData() {
        return weeksData.map(w => ({ period: `${formatDate(w.start)}-${formatDate(w.end)}`, value: w.value }));
    }

    function updateTrendGraph() {
        dynamicChart = makeTrendChart({
            canvasId: 'trendChart',
            weeks: getCurrentWeeksData(),
            planWeekly: PLAN_WEEKLY,
            emptyMessage: 'Добавьте недели',
            noteId: 'trendNote',
            previous: dynamicChart,
        });
    }

    function updatePlanFactChart(growth) {
        planFactChart = makePlanFactChart({
            canvasId: 'planFactChart',
            growth: growth,
            planWeekly: PLAN_WEEKLY,
            noteId: 'planFactNote',
            previous: planFactChart,
        });
    }

  // ==================== ПАРСИНГ CSV И ОТРИСОВКА ====================
  function renderMOSDashboard(data, options) {
        if (!data || !data.length) {
            if (window.__KNSK_DEBUG) console.warn('renderMOSDashboard: данные пусты');
            setStatus('Нет данных МО для отображения', false);
            return Promise.resolve(null);
        }
        if (!window.DashboardPhase1) {
            console.error('DashboardPhase1 не загружен');
            setStatus('Ошибка: модуль отчёта не загрузился. Обновите страницу или выполните clasp push.', false);
            return Promise.resolve(null);
        }

        const mos = DashboardPhase1.buildMosFromData(data);
        if (!mos.length) {
            if (window.__KNSK_DEBUG) console.warn('renderMOSDashboard: не удалось разобрать строки МО', data);
            setStatus('Данные архива не распознаны. Проверьте формат mosData в листе «Архив».', false);
            return Promise.resolve(null);
        }

        currentMOSData = mos;
        const opts = options || {};
        if (window.DashboardPhase2) DashboardPhase2.resetTableClickBinding();

        return DashboardPhase1.renderAll(data, {
            mos: mos,
            previousTotals: opts.previousTotals || null,
            previousMos: opts.previousMos || null,
            progressive: opts.progressive !== false,
        }).then(function (result) {
            updatePlanFactChart(result.totals ? result.totals.growth : 0);
            updateTrendGraph();

            if (window.DashboardPhase2) {
                ensureDashboardPhase2().then(function () {
                    DashboardPhase2.renderAll(mos, {
                        totals: result.totals,
                        previousMos: opts.previousMos || null,
                    });
                });
            }
            setMoProfileContext(mos, opts.archiveReportId != null ? opts.archiveReportId : null);
            return result;
        });
    }

    function applyArchiveReport(report, previousTotals, previousMos, reportId) {
        if (!window.DashboardPhase1) {
            setStatus('Модуль отчёта не загрузился. Выполните clasp push и обновите деплой.', false);
            return;
        }
        const normalized = DashboardPhase1.normalizeArchiveReport(report);
        if (!normalized || !normalized.mosData.length) {
            setStatus('В архивном отчёте нет данных МО (mosData пуст)', false);
            return;
        }
        renderMOSDashboard(normalized.mosData, {
            previousTotals: previousTotals,
            previousMos: previousMos || null,
            archiveReportId: reportId,
        });
        weeksData = (normalized.weeksData || []).map((w) => ({
            id: nextId++,
            start: w.start,
            end: w.end,
            value: w.value,
        }));
        renderWeeksInput();
        document.getElementById('doneTextInput').value = normalized.doneText || '';
        document.getElementById('plansTextInput').value = normalized.plansText || '';
        document.getElementById('periodInput').value = normalized.period || '';
        syncTextsToDashboard();
        syncPeriodToDashboard();
    }
    
    // ==================== РАБОТА С GOOGLE APPS SCRIPT ====================
    function setStatus(msg, isGood = true) {
        const el = document.getElementById('statusMessage');
        if (el) {
            el.innerHTML = msg;
            el.style.color = isGood ? '#d4edda' : '#f8d7da';
        }
    }
    
    function loadSelectedArchive() {
        const select = document.getElementById('archiveSelect');
        const selectedId = select.value;
        if (!selectedId || selectedId === '') {
            setStatus('Сначала выберите отчёт из выпадающего списка "Архив"', false);
            return;
        }
        loadArchiveReportById(parseInt(selectedId, 10));
    }

    function loadArchiveReportById(reportId) {
        setStatus('Загрузка архивного отчёта...');
        if (!gasAdapter.originalRun) {
            setStatus('Google Apps Script API недоступен. Архив работает только в веб-приложении Google Apps Script.', false);
            return;
        }

        if (window.DashboardPhase1) DashboardPhase1.showLoadingState();

        gasAdapter
            .call('getArchivedReportWithPrevious', { params: [reportId] })
            .then(function (payload) {
                const report = payload && payload.report;
                if (!report) {
                    setStatus('Пустой ответ сервера при загрузке архива', false);
                    return;
                }

                let previousTotals = null;
                let previousMos = null;
                if (payload.previous && window.DashboardPhase1) {
                    previousTotals = DashboardPhase1.computeTotalsFromMosData(payload.previous.mosData);
                    previousMos = DashboardPhase1.buildMosFromData(payload.previous.mosData);
                }

                applyArchiveReport(report, previousTotals, previousMos, reportId);
                if (window.DashboardPhase2 && DashboardPhase2.cacheArchiveReport) {
                    DashboardPhase2.cacheArchiveReport(reportId, report);
                    if (payload.previous && window.DashboardPhase1 && DashboardPhase1.getPreviousArchiveId) {
                        var prevId = DashboardPhase1.getPreviousArchiveId(
                            window.archiveReportsList || archiveReportsList,
                            reportId
                        );
                        if (prevId) DashboardPhase2.cacheArchiveReport(prevId, payload.previous);
                    }
                }
                setStatus(`✅ Загружен архивный отчёт от ${report.timestamp || '—'}`, true);
            })
            .catch(function (err) {
                if (window.DashboardPhase1) DashboardPhase1.hideLoadingState();
                setStatus('Ошибка загрузки: ' + err.message, false);
            });
    }
    
    function saveCurrentReportToArchive() {
        if (!currentMOSData || currentMOSData.length === 0) {
            setStatus('Нет данных МО для сохранения', false);
            return;
        }
        const reportData = {
            mosData: currentMOSData,
            weeksData: weeksData.map(w => ({ start: w.start, end: w.end, value: w.value })),
            doneText: document.getElementById('doneTextInput').value,
            plansText: document.getElementById('plansTextInput').value,
            period: document.getElementById('periodInput').value
        };
        setStatus('Сохранение в архив...');
        if (gasAdapter.originalRun) {
            gasAdapter
                .call('saveReportToArchive', { params: [reportData] })
                .then(function (result) {
                    setStatus(result.message, true);
                    loadArchiveList();
                })
                .catch(function (err) {
                    setStatus('Ошибка сохранения: ' + err.message, false);
                });
        } else {
            setStatus('Google Apps Script API недоступен. Архив работает только в веб-приложении Google Apps Script.', false);
        }
    }
    
    function loadArchiveList() {
        const select = document.getElementById('archiveSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">— Загрузка... —</option>';
        
        if (gasAdapter.originalRun) {
            gasAdapter
                .call('getArchivedReportsList')
                .then(function (list) {
                    archiveReportsList = list && Array.isArray(list) ? list : [];
                    window.archiveReportsList = archiveReportsList;
                    select.innerHTML = '<option value="">— Выберите отчёт —</option>';
                    if (archiveReportsList.length > 0) {
                        archiveReportsList.sort((a, b) => b.id - a.id);
                        archiveReportsList.forEach(item => {
                            const option = document.createElement('option');
                            option.value = item.id;
                            option.textContent = item.dateStr || 'Без даты';
                            select.appendChild(option);
                        });
                        if (window.DashboardPhase2) {
                            ensureDashboardPhase2().then(function () {
                                DashboardPhase2.populateCompareSelects(archiveReportsList, null);
                            });
                        }
                        setStatus(`✅ Загружено ${archiveReportsList.length} архивных отчётов`, true);
                    } else {
                        const option = document.createElement('option');
                        option.value = '';
                        option.disabled = true;
                        option.textContent = 'Нет архивных отчётов';
                        select.appendChild(option);
                        setStatus('В архиве нет сохранённых отчётов', false);
                    }
                })
                .catch(function (err) {
                    select.innerHTML = '<option value="">— Ошибка загрузки —</option>';
                    setStatus('Ошибка загрузки архива: ' + err.message, false);
                });
        } else {
            select.innerHTML = '<option value="">— API недоступен —</option>';
            setStatus('Google Apps Script API недоступен. Архив работает только в веб-приложении Google Apps Script.', false);
        }
    }
    
    // ==================== СОХРАНЕНИЕ HTML ====================
    function saveAsHtml() {
        syncTextsToDashboard();
        syncPeriodToDashboard();
    
        if (!currentMOSData || currentMOSData.length === 0) {
            setStatus('Нет данных для сохранения. Загрузите CSV или архив.', false);
            return;
        }

        setStatus('Подготовка HTML-файла...', true);
    
        const dashboardContent = document.getElementById('dashboardContent').cloneNode(true);
        
        let allStyles = '';
        const styleNodes = document.querySelectorAll('style');
        styleNodes.forEach(style => { allStyles += style.innerHTML; });

        const assetsPromise = Promise.all([
            fetch('UiPhase2.html').then((r) => (r.ok ? r.text() : '')).catch(() => ''),
            fetch('UiTokens.html').then((r) => (r.ok ? r.text() : '')).catch(() => ''),
            fetch('DashboardPhase1.html').then((r) => (r.ok ? r.text() : '')).catch(() => ''),
            fetch('DashboardPhase2.html').then((r) => (r.ok ? r.text() : '')).catch(() => ''),
        ]);

        assetsPromise.then(([phase2Css, tokensCss, phase1Js, phase2Js]) => {
            const cssOnly = (tokensCss + '\n' + phase2Css).replace(/<\/?style[^>]*>/gi, '').trim();
            buildExportHtml(dashboardContent, allStyles + '\n' + cssOnly, phase1Js, phase2Js);
        }).catch(() => {
            buildExportHtml(dashboardContent, allStyles, '', '');
        });
    }

    function buildExportHtml(dashboardContent, allStyles, phase1Js, phase2Js) {
    
        const weeksDataForExport = weeksData.map(w => ({ start: w.start, end: w.end, value: w.value }));
        const mosDataForExport = currentMOSData;
        const periodText = document.getElementById('periodInput').value;
        const doneText = document.getElementById('doneTextInput').value;
        const plansText = document.getElementById('plansTextInput').value;
        const currentDate = new Date().toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        
        function getNextWeekPeriodExport() {
            const today = new Date();
            let nextMonday = new Date(today);
            const day = today.getDay();
            let daysUntilMonday = (day === 0 ? 1 : 8 - day);
            if (day === 1) daysUntilMonday = 0;
            nextMonday.setDate(today.getDate() + daysUntilMonday);
            let nextFriday = new Date(nextMonday);
            nextFriday.setDate(nextMonday.getDate() + 4);
            const format = d => `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}`;
            return `${format(nextMonday)} - ${format(nextFriday)}`;
        }
    
        const exportHtmlHead = `<!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
        <title>Отчёт по онкоскринингу ${new Date().toLocaleDateString()}</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"><\/script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
        <style>
            ${allStyles}
            .control-panel, .dynamic-panel, .text-fields-panel, .period-input-panel,
            .btn-group, .archive-controls, .info-text, .upload-btn, .save-html-btn,
            .btn-add-week, .btn-update-chart, .btn-remove-week, #csvFile {
                display: none !important;
            }
            @media (max-width: 780px) {
                body { padding: 12px !important; }
                .dashboard { gap: 16px; }
                .kpi-grid { gap: 12px; }
                .kpi-card { padding: 14px; }
                .kpi-value { font-size: 1.6rem; }
                .charts-row, .rank-row { grid-template-columns: 1fr !important; }
                .info-blocks-row { grid-template-columns: 1fr !important; }
                .table-container { overflow-x: auto; }
                table { min-width: 600px; }
            }
        </style>
    </head>
    <body class="dashboard-phase1">
    <div class="dashboard">
        ${dashboardContent.outerHTML}
    <\/div>
    <script>
        Chart.register(ChartDataLabels);
        
        const EXPORTED_WEEKS = ${JSON.stringify(weeksDataForExport)};
        const EXPORTED_MOS = ${JSON.stringify(mosDataForExport)};
        const PLAN_WEEKLY = ${PLAN_WEEKLY};
        const DONE_TEXT = ${JSON.stringify(doneText)};
        const PLANS_TEXT = ${JSON.stringify(plansText)};
        const PERIOD_TEXT = ${JSON.stringify(periodText)};
        const NEXT_WEEK_PERIOD = ${JSON.stringify(getNextWeekPeriodExport())};
        const CURRENT_DATE = ${JSON.stringify(currentDate)};
        
        function formatDate(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return d.getDate().toString().padStart(2,'0') + '.' + (d.getMonth()+1).toString().padStart(2,'0');
        }
        
        function renderHtmlContent(text) {
            if (!text || text.trim() === '') return '—';
            const ALLOWED = /^(b|strong|a|ul|li|br)$/i;
            const SAFE_HREF = /^(https?:\\/\\/|mailto:)/i;
            function esc(s) {
                return String(s)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            }
            function sanitize(html) {
                return String(html).replace(/<\\/?([a-z][a-z0-9]*)\\b[^>]*>/gi, function (match, tag) {
                    const t = tag.toLowerCase();
                    if (!ALLOWED.test(t)) return '';
                    if (match.startsWith('</')) return '</' + t + '>';
                    if (t === 'br') return '<br>';
                    if (t === 'a') {
                        const hrefMatch = match.match(/href\\s*=\\s*(?:"([^"]*)"|'([^']*)')/i);
                        const href = hrefMatch ? (hrefMatch[1] || hrefMatch[2]) : '';
                        if (!SAFE_HREF.test(href)) return '';
                        return '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">';
                    }
                    return '<' + t + '>';
                });
            }
            const safe = sanitize(text);
            if (/<(b|strong|a|ul|li|br)\\b/i.test(safe)) {
                if (!/<br\\b/i.test(safe) && !/<li\\b/i.test(safe)) {
                    return safe.replace(/\\n/g, '<br>');
                }
                return safe;
            }
            return esc(text).replace(/\\n/g, '<br>');
        }
        
        document.getElementById('doneTextDisplay').innerHTML = renderHtmlContent(DONE_TEXT);
        document.getElementById('plansTextDisplay').innerHTML = renderHtmlContent(PLANS_TEXT);
        document.getElementById('doneDateDisplay').innerHTML = icon('calendar') + ' ' + CURRENT_DATE;
        document.getElementById('plansDateDisplay').innerHTML = icon('calendar') + ' ' + CURRENT_DATE;
        document.getElementById('nextWeekPeriodDisplay').innerHTML = NEXT_WEEK_PERIOD;
        document.getElementById('periodDisplayText').innerHTML = PERIOD_TEXT || 'Период не указан';
        
        let dynamicChart = null, planFactChart = null;
        
        function getWeeksData() {
            return EXPORTED_WEEKS.map(w => ({ 
                period: formatDate(w.start) + '-' + formatDate(w.end), 
                value: w.value 
            }));
        }
        
        function updateTrendGraph() {
            const weeks = getWeeksData();
            if (!weeks.length) return;
            const labels = weeks.map(w => w.period);
            const facts = weeks.map(w => w.value);
            const planLine = new Array(weeks.length).fill(PLAN_WEEKLY);
            const ctx = document.getElementById('trendChart').getContext('2d');
            if (dynamicChart) dynamicChart.destroy();
            dynamicChart = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets: [
                    { label: 'Факт КнСК', data: facts, borderColor: '#1f6392', borderWidth: 3, tension: 0.2, fill: false, pointRadius: 6 },
                    { label: 'План', data: planLine, borderColor: '#e67e22', borderWidth: 2.5, borderDash: [8,6], fill: false }
                ]},
                options: { responsive: true, maintainAspectRatio: true, plugins: { datalabels: { display: false }, tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ': ' + ctx.raw.toLocaleString() + ' иссл.' } } } }
            });
            const last = facts[facts.length-1];
            document.getElementById('trendNote').innerHTML = '* Последняя точка: ' + weeks[weeks.length-1].period + ' — <strong>' + last.toLocaleString() + '<\/strong> (план ~' + PLAN_WEEKLY.toLocaleString() + ')';
        }
        
        function updatePlanFactChart(growth) {
            const ctx = document.getElementById('planFactChart').getContext('2d');
            if (planFactChart) planFactChart.destroy();
            planFactChart = new Chart(ctx, {
                type: 'bar',
                data: { labels: ['Недельный план', 'Факт'], datasets: [{ label: 'Исследования КнСК', data: [PLAN_WEEKLY, growth || 0], backgroundColor: ['#2c7da0', '#e9b35f'], borderRadius: 12, barPercentage: 0.6 }] },
                options: { responsive: true, maintainAspectRatio: true, plugins: { datalabels: { display: true, color: '#1e293b', anchor: 'center', align: 'center', font: { size: 14, weight: 'bold' }, formatter: v => v.toLocaleString() } }, scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() } } } }
            });
            const pct = growth ? (growth / PLAN_WEEKLY * 100).toFixed(1) : 0;
            document.getElementById('planFactNote').innerHTML = '⚠️ <strong>' + pct + '% выполнения недельного плана<\/strong>';
        }
        
        `;

        const phase1Block = phase1Js
            ? phase1Js.replace(/<\/?script[^>]*>/gi, '').replace(/<\/script>/gi, '<\\/script>') + '\n'
            : '';
        const phase2Block = phase2Js
            ? phase2Js.replace(/<\/?script[^>]*>/gi, '').replace(/<\/script>/gi, '<\\/script>') + '\n'
            : '';

        const exportTail = `
        (function render() {
            const mos = EXPORTED_MOS;
            if (window.DashboardPhase1) {
                DashboardPhase1.renderAll(mos, { mos: mos, progressive: false }).then(function () {
                    let tGrowth = 0;
                    mos.forEach(function (m) { tGrowth += m.growth || 0; });
                    updatePlanFactChart(tGrowth);
                    updateTrendGraph();
                    if (window.DashboardPhase2) {
                        const totals = DashboardPhase1.computeTotals(mos);
                        DashboardPhase2.renderAll(mos, { totals: totals });
                    }
                });
            }
        })();
    <\/script>
    </body>
    </html>`;

        const exportHtml = exportHtmlHead + phase1Block + phase2Block + exportTail;
    
        const blob = new Blob([exportHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `oncoscreen_report_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus('HTML-файл сохранён ✅', true);
    }
    
    // ==================== ИНИЦИАЛИЗАЦИЯ ====================
    window.addEventListener('load', function() {
        function initWeeksWithLast5() {
            const today = new Date();
            let lastSunday = new Date(today);
            const dow = today.getDay();
            if (dow !== 0) lastSunday.setDate(today.getDate() - dow);
            let lastMonday = new Date(lastSunday);
            lastMonday.setDate(lastSunday.getDate() - 6);
            for (let i = 0; i < 5; i++) {
                const start = new Date(lastMonday);
                start.setDate(lastMonday.getDate() - (i * 7));
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                const format = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                weeksData.push({ id: nextId++, start: format(start), end: format(end), value: 0 });
            }
            weeksData.reverse();
            renderWeeksInput();
            if (weeksData.length) {
                const last = weeksData[weeksData.length-1];
                document.getElementById('startDate').value = last.start;
                document.getElementById('endDate').value = last.end;
            }
            updateTrendGraph();
        }
        
        initWeeksWithLast5();
        updateNextWeekPeriodDisplay();
        syncTextsToDashboard();
        syncPeriodToDashboard();
        loadArchiveList();

        initBundleLoader(gasAdapter);

        Promise.all([waitForChart(), ensureDashboardPhase2()]).then(function () {
            if (window.DashboardPhase2) {
                DashboardPhase2.init({ onStatus: setStatus, gasAdapter: gasAdapter });
            }
            ensureEcharts().catch(function (err) {
                console.warn('ECharts preload:', err);
            });
        });

        document.getElementById('csvFile').addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                if (window.DashboardPhase1) DashboardPhase1.showLoadingState();
                currentMOSData = parseCSV(ev.target.result);
                setMoProfileContext(null, null);
                renderMOSDashboard(currentMOSData).then(function () {
                    setStatus(`Загружен CSV: ${file.name}`, true);
                });
            };
            reader.readAsText(file);
        });
        
        document.getElementById('webVersionBtn').addEventListener('click', function () {
            const baseUrl = (CONFIG && CONFIG.webAppUrl) || '';
            if (!baseUrl) {
                setStatus('URL веб-версии недоступен. Разверните приложение в Apps Script.', false);
                return;
            }
            window.open(baseUrl + '?viewer=1', '_blank');
        });
        
        document.getElementById('loadSheetDataBtn').addEventListener('click', loadSelectedArchive);
        document.getElementById('saveToArchiveBtn').addEventListener('click', saveCurrentReportToArchive);
        document.getElementById('saveHtmlBtn').addEventListener('click', saveAsHtml);
        document.getElementById('addWeekBtn').addEventListener('click', addWeek);
        document.getElementById('updateDynamicChart').addEventListener('click', updateTrendGraph);
        document.getElementById('doneTextInput').addEventListener('input', syncTextsToDashboard);
        document.getElementById('plansTextInput').addEventListener('input', syncTextsToDashboard);
        document.getElementById('periodInput').addEventListener('input', syncPeriodToDashboard);
        document.getElementById('refreshArchiveBtn').addEventListener('click', loadArchiveList);

        document.getElementById('archiveSelect').addEventListener('change', function () {
            if (this.value) loadArchiveReportById(parseInt(this.value, 10));
        });
    });

  window.wrapWithLink = wrapWithLink;
  window.wrapWithBold = wrapWithBold;
  window.insertListItem = insertListItem;
})();
