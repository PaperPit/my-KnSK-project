/**
 * =============================================================================
 * forecast.js — прогноз выполнения годового плана (run-rate) и цели по охвату
 * =============================================================================
 *
 * computeKnskForecast    — успеваем ли выполнить годовой план КнСК при текущем
 *                          недельном темпе (среднее по последним точкам архива)
 * computeCoverageForecast — прогресс к цели охвата колоноскопией пациентов
 *                          с положительным КнСК (цель проекта — 70%)
 *
 * Все функции чистые (без DOM/GAS) — покрыты tests/forecast.test.js.
 * ПОСЛЕ ПРАВОК: npm run build → npm test
 * =============================================================================
 */

export const DEFAULT_COVERAGE_TARGET = 70;

/** Средний недельный темп по последним maxPoints точкам динамики (weeksTrend). */
export function averageWeeklyRate(weeks, maxPoints) {
  const limit = maxPoints || 4;
  const vals = (weeks || [])
    .map((w) => Number(w && w.value) || 0)
    .filter((v) => v > 0);
  if (!vals.length) return null;
  const tail = vals.slice(-limit);
  return tail.reduce((sum, v) => sum + v, 0) / tail.length;
}

/** Полных недель до конца текущего года (минимум 0). */
export function weeksLeftInYear(now) {
  const d = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
  const end = new Date(d.getFullYear(), 11, 31, 23, 59, 59);
  const ms = end.getTime() - d.getTime();
  return Math.max(0, Math.ceil(ms / (7 * 24 * 3600 * 1000)));
}

/**
 * Прогноз выполнения годового плана КнСК по текущему темпу.
 * @param {{ fact: number, planYear: number, weeks?: Array, avgWeekly?: number,
 *           weeksLeft?: number, now?: Date }} opts
 * @returns {object|null} null, если план не задан
 */
export function computeKnskForecast(opts) {
  const o = opts || {};
  const fact = Number(o.fact) || 0;
  const planYear = Number(o.planYear) || 0;
  if (!planYear) return null;

  const avgWeekly = o.avgWeekly != null ? Number(o.avgWeekly) : averageWeeklyRate(o.weeks);
  const weeksLeft = o.weeksLeft != null ? Math.max(0, Number(o.weeksLeft)) : weeksLeftInYear(o.now);

  const remaining = Math.max(0, planYear - fact);
  const done = remaining === 0;
  const neededWeekly = !done && weeksLeft > 0 ? remaining / weeksLeft : null;
  const projectedTotal = avgWeekly != null ? fact + avgWeekly * weeksLeft : null;
  const projectedPercent = projectedTotal != null ? (projectedTotal / planYear) * 100 : null;

  let status = 'unknown';
  if (done) {
    status = 'done';
  } else if (avgWeekly != null && neededWeekly != null) {
    if (avgWeekly >= neededWeekly) status = 'ontrack';
    else if (avgWeekly >= neededWeekly * 0.85) status = 'risk';
    else status = 'behind';
  }

  const etaWeeks = !done && avgWeekly > 0 ? Math.ceil(remaining / avgWeekly) : null;

  return {
    fact,
    planYear,
    remaining,
    avgWeekly,
    neededWeekly,
    weeksLeft,
    projectedTotal,
    projectedPercent,
    etaWeeks,
    status,
  };
}

/**
 * Прогресс к цели охвата колоноскопией пациентов с КнСК+.
 * «Прогноз» без истории: сколько колоноскопий не хватает до цели прямо сейчас.
 * @param {{ colon: number, hasDev: number, targetPercent?: number }} opts
 */
export function computeCoverageForecast(opts) {
  const o = opts || {};
  const colon = Math.max(0, Number(o.colon) || 0);
  const hasDev = Math.max(0, Number(o.hasDev) || 0);
  const targetPercent = Number(o.targetPercent) > 0 ? Number(o.targetPercent) : DEFAULT_COVERAGE_TARGET;

  const currentPercent = hasDev > 0 ? (colon / hasDev) * 100 : 0;
  const targetColon = Math.ceil((hasDev * targetPercent) / 100);
  const needColon = Math.max(0, targetColon - colon);
  const reached = hasDev > 0 && needColon === 0;
  const gapPp = Math.max(0, targetPercent - currentPercent);

  let status = 'unknown';
  if (hasDev > 0) {
    if (reached) status = 'done';
    else if (gapPp <= 10) status = 'risk';
    else status = 'behind';
  }

  return {
    colon,
    hasDev,
    targetPercent,
    currentPercent,
    targetColon,
    needColon,
    gapPp,
    reached,
    status,
  };
}
