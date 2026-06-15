/**
 * moAnalytics.js — рейтинги, тренды и выводы по одной МО
 */
import { getPlans } from './constants.js';

export function normalizeMoKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase();
}

function rankPosition(sorted, moKey, valueKey, higherIsBetter) {
  const idx = sorted.findIndex((m) => normalizeMoKey(m.name) === moKey);
  if (idx === -1) return null;
  return higherIsBetter ? idx + 1 : sorted.length - idx;
}

function coverageOf(mo) {
  return mo.hasDev > 0 ? (mo.colon / mo.hasDev) * 100 : 0;
}

/**
 * @param {string} moName
 * @param {Array} allMos — все МО текущего отчёта
 */
export function computeMoRankings(moName, allMos) {
  const key = normalizeMoKey(moName);
  const total = allMos.length;
  const mo = allMos.find((m) => normalizeMoKey(m.name) === key);

  if (!mo || !total) {
    return {
      total: 0,
      mo: null,
      byPercent: null,
      byCoverage: null,
      byGrowth: null,
      byFact: null,
      avgPercent: 0,
      avgCoverage: 0,
      topPercent: 0,
    };
  }

  const byPercent = [...allMos].sort((a, b) => b.percent - a.percent);
  const byCoverage = [...allMos].sort((a, b) => coverageOf(b) - coverageOf(a));
  const byGrowth = [...allMos].sort((a, b) => (b.growth || 0) - (a.growth || 0));
  const byFact = [...allMos].sort((a, b) => b.fact - a.fact);

  const avgPercent = allMos.reduce((s, m) => s + m.percent, 0) / total;
  const avgCoverage = allMos.reduce((s, m) => s + coverageOf(m), 0) / total;

  return {
    total,
    mo,
    byPercent: rankPosition(byPercent, key, 'percent', true),
    byCoverage: rankPosition(byCoverage, key, 'coverage', true),
    byGrowth: rankPosition(byGrowth, key, 'growth', true),
    byFact: rankPosition(byFact, key, 'fact', true),
    avgPercent,
    avgCoverage,
    topPercent: byPercent[0] ? byPercent[0].percent : 0,
    coverage: coverageOf(mo),
  };
}

/**
 * @param {Array} history — точки { percent, coverage, growth, ... }
 * @param {string} field
 * @param {number} windowSize
 */
export function detectMoTrend(history, field, windowSize) {
  const win = windowSize || 4;
  if (!history || history.length < 2) return 'stable';

  const slice = history.slice(-Math.min(win, history.length));
  const first = slice[0][field];
  const last = slice[slice.length - 1][field];
  const diff = last - first;

  if (Math.abs(diff) < 0.5) return 'stable';
  return diff > 0 ? 'up' : 'down';
}

/**
 * @param {object} mo — текущая МО
 * @param {Array} history — точки истории
 * @param {object} rankings — computeMoRankings
 * @param {object} config — CONFIG или { plans: { threshold, weekly, year } }
 */
export function buildMoInsights(mo, history, rankings, config) {
  if (!mo) return [];

  const plans = getPlans(config);
  const PLAN_THRESHOLD = plans.threshold;
  const PLAN_WEEKLY = plans.weekly;
  const COLON_THRESHOLD = 50;
  const insights = [];
  const coverage = rankings.coverage ?? (mo.hasDev > 0 ? (mo.colon / mo.hasDev) * 100 : 0);

  if (mo.percent >= PLAN_THRESHOLD) {
    insights.push({
      className: 'signal-success',
      icon: 'fa-circle-check',
      text: `Выполнение годового плана КнСК: ${mo.percent.toFixed(1)}% (порог ${PLAN_THRESHOLD}%)`,
    });
  } else {
    insights.push({
      className: mo.percent >= PLAN_THRESHOLD * 0.85 ? 'signal-warn' : 'signal-danger',
      icon: 'fa-triangle-exclamation',
      text: `Ниже порога ${PLAN_THRESHOLD}%: ${mo.percent.toFixed(1)}% годового плана КнСК`,
    });
  }

  if (coverage >= COLON_THRESHOLD) {
    insights.push({
      className: 'signal-success',
      icon: 'fa-stethoscope',
      text: `Охват колоноскопией ${coverage.toFixed(1)}% (выше порога ${COLON_THRESHOLD}%)`,
    });
  } else {
    insights.push({
      className: coverage >= COLON_THRESHOLD * 0.7 ? 'signal-warn' : 'signal-danger',
      icon: 'fa-hospital',
      text: `Охват колоноскопией ${coverage.toFixed(1)}% — ниже порога ${COLON_THRESHOLD}%`,
    });
  }

  const weekPct = PLAN_WEEKLY ? ((mo.growth || 0) / PLAN_WEEKLY) * 100 : 0;
  const weekClass =
    weekPct >= 100 ? 'signal-success' : weekPct >= 70 ? 'signal-warn' : 'signal-danger';
  insights.push({
    className: weekClass,
    icon: 'fa-calendar-week',
    text: `Недельный прирост ${(mo.growth || 0).toLocaleString('ru-RU')} (${weekPct.toFixed(0)}% от плана ${PLAN_WEEKLY.toLocaleString('ru-RU')}/нед.)`,
  });

  if (rankings.total && rankings.byPercent) {
    insights.push({
      className: rankings.byPercent <= 5 ? 'signal-success' : rankings.byPercent <= rankings.total / 2 ? 'signal-warn' : 'signal-danger',
      icon: 'fa-trophy',
      text: `${rankings.byPercent}-е место из ${rankings.total} по % годового плана КнСК`,
    });
  }

  if (rankings.total && rankings.byCoverage) {
    insights.push({
      className: rankings.byCoverage <= 5 ? 'signal-success' : 'signal-warn',
      icon: 'fa-chart-line',
      text: `${rankings.byCoverage}-е место из ${rankings.total} по охвату колоноскопией`,
    });
  }

  if (history && history.length >= 2) {
    const first = history[0];
    const last = history[history.length - 1];
    const deltaPct = last.percent - first.percent;
    const trend = detectMoTrend(history, 'percent');
    const trendText =
      trend === 'up'
        ? 'положительная'
        : trend === 'down'
          ? 'отрицательная'
          : 'стабильная';
    insights.push({
      className: deltaPct >= 0 ? 'signal-success' : 'signal-warn',
      icon: 'fa-chart-line',
      text: `Динамика % плана за ${history.length} отчётов: ${trendText} (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)} п.п.)`,
    });
  }

  if (rankings.avgPercent && mo.percent < rankings.avgPercent) {
    insights.push({
      className: 'signal-warn',
      icon: 'fa-scale-balanced',
      text: `Отставание от среднего по региону: ${mo.percent.toFixed(1)}% vs ${rankings.avgPercent.toFixed(1)}%`,
    });
  }

  return insights.slice(0, 6);
}

export function rankBadgeClass(position, total) {
  if (!position || !total) return 'mo-profile-rank-badge--mid';
  const ratio = position / total;
  if (ratio <= 0.2) return 'mo-profile-rank-badge--top';
  if (ratio <= 0.5) return 'mo-profile-rank-badge--mid';
  return 'mo-profile-rank-badge--low';
}
