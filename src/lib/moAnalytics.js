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

export function coverageOf(mo) {
  return mo.hasDev > 0 ? (mo.colon / mo.hasDev) * 100 : 0;
}

/** Фиксированное число мест в рейтинге охвата колоноскопией (КнСК+). */
export const COVERAGE_RANK_TOTAL = 47;

/** Порог «низкого» охвата колоноскопией среди КнСК+ (%). */
export const COLON_COVERAGE_LOW_THRESHOLD = 50;

function medianOf(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Минимальная динамика охвата относительно выборки МО с низким охватом:
 * снижение или стагнация (Δ ≤ 0), либо прирост не выше медианы Δ по этой выборке.
 */
export function isMinimalCoverageDynamics(coverageDeltaPp, poolDeltas) {
  if (coverageDeltaPp <= 0) return true;
  if (!poolDeltas.length) return false;
  return coverageDeltaPp <= medianOf(poolDeltas);
}

function buildCoverageRankMap(mos, minHasDev) {
  const eligible = (mos || []).filter((m) => m.hasDev >= minHasDev);
  const sorted = [...eligible].sort((a, b) => coverageOf(b) - coverageOf(a));
  const rankMap = new Map();
  sorted.forEach((m, idx) => {
    rankMap.set(normalizeMoKey(m.name), idx + 1);
  });
  return { rankMap, total: eligible.length };
}

/**
 * Топ МО по относительному приросту охвата колоноскопией среди пациентов с положительным КнСК
 * и росту позиции в рейтинге охвата между двумя архивными отчётами.
 *
 * @param {Array} mosEarlier — МО раннего отчёта
 * @param {Array} mosLater — МО позднего отчёта
 * @param {{ minHasDev?: number, limit?: number }} options
 */
export function computeTopColonCoverageGainers(mosEarlier, mosLater, options) {
  const minHasDev = (options && options.minHasDev) ?? 10;
  const limit = (options && options.limit) ?? 5;

  const ranksEarlier = buildCoverageRankMap(mosEarlier, minHasDev);
  const ranksLater = buildCoverageRankMap(mosLater, minHasDev);

  const laterMap = new Map();
  (mosLater || []).forEach((m) => {
    laterMap.set(normalizeMoKey(m.name), m);
  });

  const candidates = [];

  (mosEarlier || []).forEach((mA) => {
    const key = normalizeMoKey(mA.name);
    const mB = laterMap.get(key);
    if (!mB || mB.hasDev < minHasDev) return;

    const covA = coverageOf(mA);
    const covB = coverageOf(mB);
    if (covB <= covA) return;

    const rankA = ranksEarlier.rankMap.get(key);
    const rankB = ranksLater.rankMap.get(key);
    if (!rankA || !rankB) return;

    const rankRise = rankA - rankB;
    const coverageDeltaPp = covB - covA;
    const colonEarlier = mA.colon || 0;
    const colonLater = mB.colon || 0;
    const colonDelta = colonLater - colonEarlier;

    candidates.push({
      name: mA.name,
      coverageEarlier: covA,
      coverageLater: covB,
      coverageDeltaPp,
      relativePctGrowth: covA > 0 ? (coverageDeltaPp / covA) * 100 : null,
      rankEarlier: rankA,
      rankLater: rankB,
      rankRise,
      rankTotal: COVERAGE_RANK_TOTAL,
      colonEarlier,
      colonLater,
      colonDelta,
    });
  });

  candidates.sort((a, b) => {
    const relA = a.relativePctGrowth ?? 0;
    const relB = b.relativePctGrowth ?? 0;
    if (relB !== relA) return relB - relA;
    if (b.rankRise !== a.rankRise) return b.rankRise - a.rankRise;
    return b.coverageDeltaPp - a.coverageDeltaPp;
  });

  return candidates.slice(0, limit);
}

/**
 * МО с низким охватом колоноскопией среди КнСК+ и минимальной динамикой охвата
 * между двумя архивными отчётами.
 *
 * 1) Первичный фильтр: охват в позднем периоде ниже порога (по умолчанию 50%).
 * 2) Динамика: Δ ≤ 0 или Δ не выше медианы Δ среди всех МО с низким охватом.
 *
 * @param {Array} mosEarlier — МО раннего отчёта
 * @param {Array} mosLater — МО позднего отчёта
 * @param {{ minHasDev?: number, limit?: number, maxCoverage?: number }} options
 */
export function computeLowCoverageStagnantMOs(mosEarlier, mosLater, options) {
  const minHasDev = (options && options.minHasDev) ?? 10;
  const limit = (options && options.limit) ?? 5;
  const maxCoverage = (options && options.maxCoverage) ?? COLON_COVERAGE_LOW_THRESHOLD;

  const earlierMap = new Map();
  (mosEarlier || []).forEach((m) => {
    earlierMap.set(normalizeMoKey(m.name), m);
  });

  const lowCoveragePool = [];

  (mosLater || []).forEach((mB) => {
    if (mB.hasDev < minHasDev) return;

    const key = normalizeMoKey(mB.name);
    const mA = earlierMap.get(key);
    if (!mA || mA.hasDev < minHasDev) return;

    const covA = coverageOf(mA);
    const covB = coverageOf(mB);
    if (covB >= maxCoverage) return;

    const coverageDeltaPp = covB - covA;
    const hasDevEarlier = mA.hasDev || 0;
    const hasDevLater = mB.hasDev || 0;
    const colonEarlier = mA.colon || 0;
    const colonLater = mB.colon || 0;

    lowCoveragePool.push({
      name: mB.name,
      coverageEarlier: covA,
      coverageLater: covB,
      coverageDeltaPp,
      hasDevEarlier,
      hasDevLater,
      hasDevDelta: hasDevLater - hasDevEarlier,
      colonEarlier,
      colonLater,
      colonDelta: colonLater - colonEarlier,
    });
  });

  const poolDeltas = lowCoveragePool.map((m) => m.coverageDeltaPp);
  const candidates = lowCoveragePool.filter((m) =>
    isMinimalCoverageDynamics(m.coverageDeltaPp, poolDeltas)
  );

  candidates.sort((a, b) => {
    // Основной критерий: % охвата колоноскопией среди КнСК+ в позднем периоде (от меньшего к большему)
    if (a.coverageLater !== b.coverageLater) return a.coverageLater - b.coverageLater;
    if (a.coverageDeltaPp !== b.coverageDeltaPp) return a.coverageDeltaPp - b.coverageDeltaPp;
    return normalizeMoKey(a.name).localeCompare(normalizeMoKey(b.name), 'ru');
  });

  return candidates.slice(0, limit);
}

/**
 * МО с высоким охватом колоноскопией среди КнСК+ и наилучшей положительной
 * динамикой охвата между двумя архивными отчётами.
 *
 * 1) Охват в позднем периоде не ниже порога (по умолчанию 50%).
 * 2) Положительный прирост охвата (Δ > 0).
 * 3) Сортировка: по Δ убыванию, затем по охвату позднего периода.
 *
 * @param {Array} mosEarlier
 * @param {Array} mosLater
 * @param {{ minHasDev?: number, limit?: number, minCoverage?: number }} options
 */
export function computeHighCoverageTopDynamicsMOs(mosEarlier, mosLater, options) {
  const minHasDev = (options && options.minHasDev) ?? 10;
  const limit = (options && options.limit) ?? 5;
  const minCoverage = (options && options.minCoverage) ?? COLON_COVERAGE_LOW_THRESHOLD;

  const earlierMap = new Map();
  (mosEarlier || []).forEach((m) => {
    earlierMap.set(normalizeMoKey(m.name), m);
  });

  const candidates = [];

  (mosLater || []).forEach((mB) => {
    if (mB.hasDev < minHasDev) return;

    const key = normalizeMoKey(mB.name);
    const mA = earlierMap.get(key);
    if (!mA || mA.hasDev < minHasDev) return;

    const covA = coverageOf(mA);
    const covB = coverageOf(mB);
    if (covB < minCoverage) return;

    const coverageDeltaPp = covB - covA;
    if (coverageDeltaPp <= 0) return;

    const hasDevEarlier = mA.hasDev || 0;
    const hasDevLater = mB.hasDev || 0;
    const colonEarlier = mA.colon || 0;
    const colonLater = mB.colon || 0;

    candidates.push({
      name: mB.name,
      coverageEarlier: covA,
      coverageLater: covB,
      coverageDeltaPp,
      hasDevEarlier,
      hasDevLater,
      hasDevDelta: hasDevLater - hasDevEarlier,
      colonEarlier,
      colonLater,
      colonDelta: colonLater - colonEarlier,
    });
  });

  candidates.sort((a, b) => {
    if (b.coverageDeltaPp !== a.coverageDeltaPp) return b.coverageDeltaPp - a.coverageDeltaPp;
    if (b.coverageLater !== a.coverageLater) return b.coverageLater - a.coverageLater;
    return normalizeMoKey(a.name).localeCompare(normalizeMoKey(b.name), 'ru');
  });

  return candidates.slice(0, limit);
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
      icon: 'circle-check',
      text: `Выполнение годового плана КнСК: ${mo.percent.toFixed(1)}% (порог ${PLAN_THRESHOLD}%)`,
    });
  } else {
    insights.push({
      className: mo.percent >= PLAN_THRESHOLD * 0.85 ? 'signal-warn' : 'signal-danger',
      icon: 'triangle-alert',
      text: `Ниже порога ${PLAN_THRESHOLD}%: ${mo.percent.toFixed(1)}% годового плана КнСК`,
    });
  }

  if (coverage >= COLON_THRESHOLD) {
    insights.push({
      className: 'signal-success',
      icon: 'stethoscope',
      text: `Охват колоноскопией ${coverage.toFixed(1)}% (выше порога ${COLON_THRESHOLD}%)`,
    });
  } else {
    insights.push({
      className: coverage >= COLON_THRESHOLD * 0.7 ? 'signal-warn' : 'signal-danger',
      icon: 'building-2',
      text: `Охват колоноскопией ${coverage.toFixed(1)}% — ниже порога ${COLON_THRESHOLD}%`,
    });
  }

  const weekPct = PLAN_WEEKLY ? ((mo.growth || 0) / PLAN_WEEKLY) * 100 : 0;
  const weekClass =
    weekPct >= 100 ? 'signal-success' : weekPct >= 70 ? 'signal-warn' : 'signal-danger';
  insights.push({
    className: weekClass,
    icon: 'calendar-days',
    text: `Недельный прирост ${(mo.growth || 0).toLocaleString('ru-RU')} (${weekPct.toFixed(0)}% от плана ${PLAN_WEEKLY.toLocaleString('ru-RU')}/нед.)`,
  });

  if (rankings.total && rankings.byPercent) {
    insights.push({
      className: rankings.byPercent <= 5 ? 'signal-success' : rankings.byPercent <= rankings.total / 2 ? 'signal-warn' : 'signal-danger',
      icon: 'trophy',
      text: `${rankings.byPercent}-е место из ${rankings.total} по % годового плана КнСК`,
    });
  }

  if (rankings.total && rankings.byCoverage) {
    insights.push({
      className: rankings.byCoverage <= 5 ? 'signal-success' : 'signal-warn',
      icon: 'trending-up',
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
      icon: 'trending-up',
      text: `Динамика % плана за ${history.length} отчётов: ${trendText} (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)} п.п.)`,
    });
  }

  if (rankings.avgPercent && mo.percent < rankings.avgPercent) {
    insights.push({
      className: 'signal-warn',
      icon: 'scale',
      text: `Отставание от среднего по региону: ${mo.percent.toFixed(1)}% vs ${rankings.avgPercent.toFixed(1)}%`,
    });
  }

  return insights.slice(0, 6);
}

/** Минимальный объём КнСК для блока «высокий объём / низкая доля КнСК+». */
export const KNSK_HIGH_VOLUME_MIN_FACT = 500;

/** Порог z-score доли положительных КнСК (ниже среднего). */
export const KNSK_POSITIVE_RATE_Z_THRESHOLD = -1.5;

/** Доля положительных результатов КнСК, %. */
export function positiveRateOf(mo) {
  return mo.fact > 0 ? ((mo.hasDev || 0) / mo.fact) * 100 : 0;
}

function meanOf(values) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function sampleStd(values) {
  const n = values.length;
  if (n < 2) return 0;
  const mean = meanOf(values);
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

/**
 * МО с большим объёмом КнСК (≥ minFact) и аномально низкой долей КнСК+ относительно всех МО.
 * Критерий: z-score доли положительных ≤ zThreshold (по умолчанию −1,5 σ).
 *
 * @param {Array} mos
 * @param {{ minFact?: number, limit?: number, zThreshold?: number }} options
 */
export function computeHighVolumeLowPositiveOutliers(mos, options) {
  const minFact = (options && options.minFact) ?? KNSK_HIGH_VOLUME_MIN_FACT;
  const limit = (options && options.limit) ?? 5;
  const zThreshold = (options && options.zThreshold) ?? KNSK_POSITIVE_RATE_Z_THRESHOLD;

  const withFact = (mos || []).filter((m) => m.fact > 0);
  const rates = withFact.map(positiveRateOf);
  const hasDevCounts = withFact.map((m) => m.hasDev || 0);

  const meanRate = meanOf(rates);
  const stdRate = sampleStd(rates);
  const medianRate = medianOf(rates);
  const meanHasDev = meanOf(hasDevCounts);

  const totalFact = withFact.reduce((sum, m) => sum + m.fact, 0);
  const totalHasDev = withFact.reduce((sum, m) => sum + (m.hasDev || 0), 0);
  const networkPositiveRate = totalFact > 0 ? (totalHasDev / totalFact) * 100 : 0;

  const highVolume = withFact.filter((m) => m.fact >= minFact);

  const enriched = highVolume.map((m) => {
    const positiveRate = positiveRateOf(m);
    const zScore = stdRate > 0 ? (positiveRate - meanRate) / stdRate : 0;
    const expectedHasDev = (meanRate / 100) * m.fact;
    const deviationCount = (m.hasDev || 0) - expectedHasDev;
    return {
      name: m.name,
      fact: m.fact,
      hasDev: m.hasDev || 0,
      noDev: m.noDev || 0,
      positiveRate,
      zScore,
      deviationPp: positiveRate - meanRate,
      expectedHasDev,
      deviationCount,
    };
  });

  let candidates = enriched.filter(
    (m) => m.positiveRate < meanRate && (stdRate > 0 ? m.zScore <= zThreshold : m.deviationPp < -0.5)
  );

  if (!candidates.length) {
    candidates = enriched.filter((m) => m.positiveRate < meanRate);
  }

  candidates.sort((a, b) => {
    if (a.positiveRate !== b.positiveRate) return a.positiveRate - b.positiveRate;
    if (b.fact !== a.fact) return b.fact - a.fact;
    return normalizeMoKey(a.name).localeCompare(normalizeMoKey(b.name), 'ru');
  });

  return {
    benchmark: {
      moCount: withFact.length,
      highVolumeCount: highVolume.length,
      meanPositiveRate: meanRate,
      stdPositiveRate: stdRate,
      medianPositiveRate: medianRate,
      meanHasDev,
      networkPositiveRate,
      totalFact,
      totalHasDev,
    },
    minFact,
    zThreshold,
    items: candidates.slice(0, limit),
  };
}

export function rankBadgeClass(position, total) {
  if (!position || !total) return 'mo-profile-rank-badge--mid';
  const ratio = position / total;
  if (ratio <= 0.2) return 'mo-profile-rank-badge--top';
  if (ratio <= 0.5) return 'mo-profile-rank-badge--mid';
  return 'mo-profile-rank-badge--low';
}
