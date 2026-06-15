/**
 * =============================================================================
 * kpiCalculator.js — строки МО и сводные KPI
 * =============================================================================
 *
 * buildMosFromData(data)
 *   На входе: либо сырой CSV (русские заголовки колонок), либо уже сохранённый
 *   mosData из архива (поля name, plan, fact, …).
 *   На выходе: единый массив объектов МО для дашборда.
 *
 * computeTotals(mos) — суммы по всем МО + % плана и % колоноскопии.
 * computePeriodDeltas — разница между двумя отчётами (сравнение периодов).
 *
 * ПОСЛЕ ПРАВОК: npm run build → npm test (tests/kpiCalculator.test.js)
 * =============================================================================
 */
import { extractNumber, extractFact, toNum } from './numbers.js';

export function buildMosFromData(data) {
  if (!data || !data.length) return [];

  const firstRow = data[0];
  if (!firstRow || typeof firstRow !== 'object') return [];

  // Архив и повторная загрузка уже в «плоском» формате
  const hasProcessedShape =
    (firstRow.name != null || firstRow['Наименование МО']) &&
    (firstRow.plan != null ||
      firstRow.fact != null ||
      firstRow['План на год'] != null ||
      firstRow['Общий итог'] != null);

  const mos = [];

  if (hasProcessedShape) {
    data.forEach((r) => {
      const plan = toNum(r.plan != null ? r.plan : r['План на год']);
      const fact = toNum(r.fact != null ? r.fact : r['Общий итог']);
      const percentRaw = r.percent != null ? toNum(r.percent) : plan ? (fact / plan) * 100 : 0;
      mos.push({
        name: r.name || r['Наименование МО'] || 'МО',
        plan,
        fact,
        percent: percentRaw,
        growth: toNum(r.growth != null ? r.growth : r['Динамика с прошлой недели']),
        colon: toNum(r.colon != null ? r.colon : r['Прошли колоноскопию']),
        zno: toNum(r.zno != null ? r.zno : r['Выявлено ЗНО C18-C21']),
        noDev: toNum(r.noDev != null ? r.noDev : r['Нет отклонений']),
        hasDev: toNum(r.hasDev != null ? r.hasDev : r['Есть отклонения']),
      });
    });
  } else {
    // Свежий CSV с русскими заголовками
    data.forEach((r) => {
      const plan = extractNumber(r['План на год']);
      const fact = extractFact(r['Общий итог']);
      mos.push({
        name: r['Наименование МО'] || r.name || 'МО',
        plan,
        fact,
        percent: plan ? (fact / plan) * 100 : 0,
        growth: extractNumber(r['Динамика с прошлой недели']),
        colon: extractNumber(r['Прошли колоноскопию']),
        zno: extractNumber(r['Выявлено ЗНО C18-C21']),
        noDev: extractNumber(r['Нет отклонений']),
        hasDev: extractNumber(r['Есть отклонения']),
      });
    });
  }

  return mos;
}

/** Агрегированные показатели по всем МО для 4 KPI-карточек */
export function computeTotals(mos) {
  const t = {
    plan: 0,
    fact: 0,
    colon: 0,
    zno: 0,
    noDev: 0,
    hasDev: 0,
    growth: 0,
    percent: 0,
    colonPercent: 0,
  };
  mos.forEach((m) => {
    t.plan += m.plan;
    t.fact += m.fact;
    t.colon += m.colon;
    t.zno += m.zno;
    t.noDev += m.noDev;
    t.hasDev += m.hasDev;
    t.growth += m.growth;
  });
  t.percent = t.plan ? (t.fact / t.plan) * 100 : 0;
  // Охват колоноскопией: от положительных КнСК (hasDev), не от всех исследований
  t.colonPercent = t.hasDev ? (t.colon / t.hasDev) * 100 : 0;
  return t;
}

export function computeTotalsFromMosData(mosData) {
  return computeTotals(buildMosFromData(mosData));
}

/** % годового плана КнСК (220 000) — для KPI «План на год» */
export function computeYearPercent(totals, planYear) {
  return planYear ? (totals.fact / planYear) * 100 : 0;
}

/**
 * Дельты для сравнения двух архивных отчётов (поздний − ранний).
 * percent — разница % от планов МО; yearPercent — разница % от годового плана
 * (planYear) — её использует compare-панель для карточки «％ год. плана».
 */
export function computePeriodDeltas(currentTotals, previousTotals, planYear) {
  if (!previousTotals) return null;
  const yearPct = (t) => (planYear ? (t.fact / planYear) * 100 : 0);
  return {
    fact: currentTotals.fact - previousTotals.fact,
    percent: currentTotals.percent - previousTotals.percent,
    yearPercent: yearPct(currentTotals) - yearPct(previousTotals),
    growth: currentTotals.growth - previousTotals.growth,
    colon: currentTotals.colon - previousTotals.colon,
    zno: currentTotals.zno - previousTotals.zno,
  };
}
