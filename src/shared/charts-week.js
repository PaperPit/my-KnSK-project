/**
 * Общие графики недельного плана и динамики КнСК (Chart.js)
 */
const ChartsWeek = (function () {
  let dynamicChart = null;
  let planFactChart = null;

  function planWeekly() {
    return window.PLAN_WEEKLY || 3333;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  function normalizeWeeks(weeksInput) {
    if (!weeksInput) return [];
    const raw = typeof weeksInput === 'function' ? weeksInput() : weeksInput;
    if (!raw || !raw.length) return [];
    if (raw[0].period != null) return raw;
    return raw.map((w) => ({
      period: `${formatDate(w.start)}-${formatDate(w.end)}`,
      value: w.value,
    }));
  }

  function updateTrendGraph(weeksInput) {
    const weeks = normalizeWeeks(weeksInput);
    const trendNote = document.getElementById('trendNote');
    const canvas = document.getElementById('trendChart');

    if (!weeks.length) {
      if (trendNote) trendNote.innerHTML = 'Добавьте недели';
      if (dynamicChart) {
        dynamicChart.destroy();
        dynamicChart = null;
      }
      return;
    }

    if (!canvas || typeof Chart === 'undefined') return;

    const labels = weeks.map((w) => w.period);
    const facts = weeks.map((w) => w.value);
    const planLine = new Array(weeks.length).fill(planWeekly());
    const ctx = canvas.getContext('2d');

    if (dynamicChart) dynamicChart.destroy();
    dynamicChart = new Chart(ctx, {
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
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()} иссл.`,
            },
          },
        },
      },
    });

    if (trendNote) {
      trendNote.innerHTML = `* Последняя точка: ${weeks[weeks.length - 1].period} — <strong>${facts[facts.length - 1].toLocaleString()}</strong> (план ~${planWeekly().toLocaleString()})`;
    }
  }

  function updatePlanFactChart(growth) {
    const canvas = document.getElementById('planFactChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (planFactChart) planFactChart.destroy();

    planFactChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Недельный план', 'Факт'],
        datasets: [
          {
            label: 'Исследования КнСК',
            data: [planWeekly(), growth || 0],
            backgroundColor: ['#2c7da0', '#e9b35f'],
            borderRadius: 12,
            barPercentage: 0.6,
            categoryPercentage: 0.8,
          },
        ],
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

    const pct = growth ? ((growth / planWeekly()) * 100).toFixed(1) : 0;
    const planFactNote = document.getElementById('planFactNote');
    if (planFactNote) {
      planFactNote.innerHTML = `⚠️ <strong>${pct}% выполнения недельного плана</strong>`;
    }
  }

  function destroyAll() {
    if (dynamicChart) {
      dynamicChart.destroy();
      dynamicChart = null;
    }
    if (planFactChart) {
      planFactChart.destroy();
      planFactChart = null;
    }
  }

  return {
    formatDate,
    normalizeWeeks,
    updateTrendGraph,
    updatePlanFactChart,
    destroyAll,
  };
})();

if (typeof window !== 'undefined') {
  window.ChartsWeek = ChartsWeek;
}
