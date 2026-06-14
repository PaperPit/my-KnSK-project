/**
 * chartTheme.js — единый стиль Chart.js (Linear / Vercel analytics)
 */
const ChartTheme = (function () {
  const palette = {
    ink: '#18181b',
    muted: '#71717a',
    grid: 'rgba(0, 0, 0, 0.04)',
    border: 'transparent',
    blue: '#3b82f6',
    blueSoft: 'rgba(59, 130, 246, 0.12)',
    green: '#22c55e',
    greenSoft: 'rgba(34, 197, 94, 0.15)',
    amber: '#f59e0b',
    amberSoft: 'rgba(245, 158, 11, 0.15)',
    red: '#ef4444',
    redSoft: 'rgba(239, 68, 68, 0.12)',
    violet: '#8b5cf6',
    slate: '#94a3b8',
  };

  const font = {
    family: "'Inter', system-ui, sans-serif",
    size: 11,
  };

  function baseOptions() {
    return {
      responsive: true,
      maintainAspectRatio: true,
      animation: {
        duration: 720,
        easing: 'easeOutQuart',
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: palette.muted,
            font: { family: font.family, size: 11, weight: '500' },
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(24, 24, 27, 0.92)',
          titleColor: '#fafafa',
          bodyColor: '#e4e4e7',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          titleFont: { family: font.family, size: 12, weight: '600' },
          bodyFont: { family: font.family, size: 11 },
          displayColors: true,
          boxPadding: 4,
        },
      },
    };
  }

  function scaleX(extra) {
    return Object.assign(
      {
        grid: { display: false, drawBorder: false },
        border: { display: false },
        ticks: {
          color: palette.muted,
          font: { family: font.family, size: font.size },
          maxRotation: 0,
        },
      },
      extra || {}
    );
  }

  function scaleY(extra) {
    return Object.assign(
      {
        beginAtZero: true,
        grid: {
          color: palette.grid,
          drawBorder: false,
          lineWidth: 1,
        },
        border: { display: false, dash: [4, 4] },
        ticks: {
          color: palette.muted,
          font: { family: font.family, size: font.size },
          padding: 8,
        },
      },
      extra || {}
    );
  }

  function barGradient(ctx, chartArea, from, to) {
    if (!ctx || !chartArea) return from;
    const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    g.addColorStop(0, from);
    g.addColorStop(1, to);
    return g;
  }

  function mergeOptions(custom) {
    const base = baseOptions();
    if (!custom) return base;
    return Object.assign({}, base, custom, {
      plugins: Object.assign({}, base.plugins, custom.plugins || {}),
      scales: Object.assign({}, custom.scales || {}),
    });
  }

  function afterChartBuild(chart) {
    if (!chart || !chart.canvas) return;
    chart.canvas.classList.add('chart-canvas-ready');
    if (window.SaaSMotion && typeof SaaSMotion.revealChart === 'function') {
      SaaSMotion.revealChart(chart.canvas);
    }
  }

  function createTrendChart(ctx, config) {
    const cfg = config || {};
    if (cfg.existingChart) cfg.existingChart.destroy();
    const labels = cfg.labels || [];
    const facts = cfg.facts || [];
    const planWeekly = cfg.planWeekly || 0;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Факт КнСК',
            data: facts,
            borderColor: palette.blue,
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            backgroundColor: palette.blueSoft,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: palette.blue,
            pointBorderWidth: 0,
          },
          {
            label: 'План',
            data: new Array(labels.length).fill(planWeekly),
            borderColor: palette.slate,
            borderWidth: 1.5,
            borderDash: [6, 4],
            fill: false,
            pointRadius: 0,
          },
        ],
      },
      options: mergeOptions({
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true },
          datalabels: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => `${c.dataset.label}: ${c.raw.toLocaleString('ru-RU')} иссл.`,
            },
          },
        },
        scales: {
          x: scaleX({ ticks: { maxRotation: 45, minRotation: 0, font: { size: 10 } } }),
          y: scaleY({ ticks: { callback: (v) => v.toLocaleString('ru-RU') } }),
        },
      }),
    });
    afterChartBuild(chart);
    return chart;
  }

  function createPlanFactChart(ctx, config) {
    const cfg = config || {};
    if (cfg.existingChart) cfg.existingChart.destroy();
    const planWeekly = cfg.planWeekly || 0;
    const growth = cfg.growth || 0;
    const factColor = growth >= planWeekly ? palette.green : palette.amber;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Недельный план', 'Факт'],
        datasets: [
          {
            label: 'Исследования КнСК',
            data: [planWeekly, growth],
            backgroundColor: [palette.slate, factColor],
            borderRadius: 6,
            barPercentage: 0.55,
            categoryPercentage: 0.75,
            hoverBackgroundColor: [palette.slate, factColor],
          },
        ],
      },
      options: mergeOptions({
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          datalabels: {
            display: true,
            color: palette.ink,
            anchor: 'center',
            align: 'center',
            font: { size: 12, weight: '600', family: font.family },
            formatter: (v) => v.toLocaleString('ru-RU'),
          },
        },
        scales: {
          x: scaleX({ grid: { display: false } }),
          y: scaleY({
            ticks: { callback: (v) => v.toLocaleString('ru-RU') },
          }),
        },
      }),
    });
    afterChartBuild(chart);
    return chart;
  }

  return {
    palette,
    font,
    baseOptions,
    scaleX,
    scaleY,
    barGradient,
    mergeOptions,
    afterChartBuild,
    createTrendChart,
    createPlanFactChart,
  };
})();

if (typeof window !== 'undefined') {
  window.ChartTheme = ChartTheme;
}
