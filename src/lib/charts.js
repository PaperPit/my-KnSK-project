/**
 * =============================================================================
 * charts.js — общие фабрики графиков Chart.js (editor/viewer)
 * =============================================================================
 */

function chartAnimationsEnabled() {
  return typeof CONFIG !== 'undefined' && CONFIG.ui && CONFIG.ui.animationsEnabled === true;
}

function updateTrendNote(noteId, weeksArr, facts, planWeekly) {
  const note = document.getElementById(noteId);
  if (!note || !weeksArr.length) return;
  const last = weeksArr[weeksArr.length - 1];
  note.innerHTML = `* Последняя точка: ${last.period} — <strong>${facts[facts.length - 1].toLocaleString()}</strong> (план ~${planWeekly.toLocaleString()})`;
}

/**
 * Линейный график динамики КнСК по неделям (факт + линия плана).
 * При наличии previous обновляет данные без destroy — без дёргания.
 */
export function makeTrendChart(opts) {
  const { canvasId, weeks, planWeekly, emptyMessage, noteId, previous } = opts;
  const weeksArr = weeks || [];
  const animate = chartAnimationsEnabled();

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
  if (!canvas) return null;

  if (
    previous &&
    typeof previous.update === 'function' &&
    previous.canvas === canvas &&
    previous.config.type === 'line'
  ) {
    previous.data.labels = labels;
    previous.data.datasets[0].data = facts;
    previous.data.datasets[1].data = planLine;
    previous.update(animate ? 'active' : 'none');
    updateTrendNote(noteId, weeksArr, facts, planWeekly);
    return previous;
  }

  if (previous) previous.destroy();
  const ctx = canvas.getContext('2d');

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
          pointRadius: 5,
          pointHoverRadius: 6,
        },
        {
          label: 'План',
          data: planLine,
          borderColor: '#e67e22',
          borderWidth: 2,
          borderDash: [8, 6],
          fill: false,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: animate ? { duration: 280, easing: 'easeOutQuart' } : false,
      transitions: {
        active: { animation: { duration: animate ? 200 : 0 } },
      },
      plugins: {
        datalabels: { display: false },
        legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 8 } },
        tooltip: {
          callbacks: {
            label: (c) => `${c.dataset.label}: ${c.raw.toLocaleString()} иссл.`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { maxTicksLimit: 6, callback: (v) => v.toLocaleString('ru-RU') },
        },
        x: {
          ticks: { maxRotation: 0, autoSkip: false, font: { size: 10 } },
        },
      },
    },
  });

  updateTrendNote(noteId, weeksArr, facts, planWeekly);
  return chart;
}

/**
 * Столбчатый график «Недельный план vs Факт».
 */
export function makePlanFactChart(opts) {
  const { canvasId, growth, planWeekly, noteId, previous } = opts;
  const categoryPercentage = opts.categoryPercentage;
  const animate = chartAnimationsEnabled();
  const fact = growth || 0;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return previous || null;

  if (
    previous &&
    typeof previous.update === 'function' &&
    previous.canvas === canvas &&
    previous.config.type === 'bar'
  ) {
    previous.data.datasets[0].data = [planWeekly, fact];
    previous.update(animate ? 'active' : 'none');
    const pct = fact ? ((fact / planWeekly) * 100).toFixed(1) : 0;
    const note = document.getElementById(noteId);
    if (note) note.innerHTML = `⚠️ <strong>${pct}% выполнения недельного плана</strong>`;
    return previous;
  }

  if (previous) previous.destroy();
  const ctx = canvas.getContext('2d');
  const dataset = {
    label: 'Исследования КнСК',
    data: [planWeekly, fact],
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
      animation: animate ? { duration: 280, easing: 'easeOutQuart' } : false,
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

  const pct = fact ? ((fact / planWeekly) * 100).toFixed(1) : 0;
  const note = document.getElementById(noteId);
  if (note) note.innerHTML = `⚠️ <strong>${pct}% выполнения недельного плана</strong>`;
  return chart;
}
