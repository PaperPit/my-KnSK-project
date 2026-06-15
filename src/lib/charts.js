/**
 * =============================================================================
 * charts.js — общие фабрики графиков Chart.js (editor/viewer)
 * =============================================================================
 *
 * Раньше updateTrendGraph и updatePlanFactChart дублировались в editor.js и
 * viewer.js с мелкими отличиями (сигнатура, categoryPercentage, null-guards).
 * Здесь они параметризованы через options — поведение идентично исходным.
 *
 * ВАЖНО: фабрики принимают уже предобработанные недели в формате
 * { period: 'dd.mm-dd.mm', value: число }. Caller отвечает за формирование period.
 *
 * Каждая фабрика уничтожает previous (если задан) и возвращает новый инстанс
 * Chart.js (или null, если данных нет). Caller хранит инстанс у себя.
 *
 * ПОСЛЕ ПРАВОК: npm run build → npm test (tests/charts.test.js)
 * =============================================================================
 */

/**
 * Линейный график динамики КнСК по неделям (факт + линия плана).
 *
 * @param {object} opts
 * @param {string} opts.canvasId   — id <canvas> ('trendChart')
 * @param {Array}  opts.weeks      — [{ period, value }] (пусто → empty state)
 * @param {number} opts.planWeekly — недельный план (плановая линия)
 * @param {string} opts.emptyMessage — подпись при отсутствии недель
 * @param {string} opts.noteId     — id элемента-подписи ('trendNote'), null-guards
 * @param {Chart|null} opts.previous — старый инстанс для destroy()
 * @returns {Chart|null} новый инстанс или null
 */
export function makeTrendChart(opts) {
  const { canvasId, weeks, planWeekly, emptyMessage, noteId, previous } = opts;
  const weeksArr = weeks || [];

  if (!weeksArr.length) {
    const note = document.getElementById(noteId);
    if (note) note.innerHTML = emptyMessage || '';
    if (previous) previous.destroy();
    return null;
  }

  const labels = weeksArr.map((w) => w.period);
  const facts = weeksArr.map((w) => w.value);
  const planLine = new Array(weeksArr.length).fill(planWeekly);
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  if (previous) previous.destroy();

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Факт КнСК',
          data: facts,
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
            label: (c) => `${c.dataset.label}: ${c.raw.toLocaleString()} иссл.`,
          },
        },
      },
    },
  });

  const note = document.getElementById(noteId);
  if (note) {
    const last = weeksArr[weeksArr.length - 1];
    note.innerHTML = `* Последняя точка: ${last.period} — <strong>${facts[facts.length - 1].toLocaleString()}</strong> (план ~${planWeekly.toLocaleString()})`;
  }
  return chart;
}

/**
 * Столбчатый график «Недельный план vs Факт».
 *
 * @param {object} opts
 * @param {string} opts.canvasId    — id <canvas> ('planFactChart')
 * @param {number} opts.growth      — факт недели
 * @param {number} opts.planWeekly  — недельный план
 * @param {number} [opts.categoryPercentage] — ширина группы (viewer: 0.8, editor: по умолчанию)
 * @param {string} opts.noteId      — id подписи ('planFactNote'), null-guards
 * @param {Chart|null} opts.previous — старый инстанс для destroy()
 * @returns {Chart} новый инстанс
 */
export function makePlanFactChart(opts) {
  const { canvasId, growth, planWeekly, noteId, previous } = opts;
  const categoryPercentage = opts.categoryPercentage;

  if (previous) previous.destroy();
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const dataset = {
    label: 'Исследования КнСК',
    data: [planWeekly, growth || 0],
    backgroundColor: ['#2c7da0', '#e9b35f'],
    borderRadius: 12,
    barPercentage: 0.6,
  };
  if (categoryPercentage != null) dataset.categoryPercentage = categoryPercentage;

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Недельный план', 'Факт'],
      datasets: [dataset],
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
          formatter: (v) => v.toLocaleString(),
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Количество исследований' },
          ticks: { callback: (v) => v.toLocaleString() },
        },
      },
    },
  });

  const pct = growth ? ((growth / planWeekly) * 100).toFixed(1) : 0;
  const note = document.getElementById(noteId);
  if (note) {
    note.innerHTML = `⚠️ <strong>${pct}% выполнения недельного плана</strong>`;
  }
  return chart;
}
