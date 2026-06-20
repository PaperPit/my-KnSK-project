/**
 * weeklyDynamics.js — автоматический график «Динамика КнСК» из еженедельных архивов
 *
 * Каждая точка = один архивный отчёт: сумма столбца «Динамика» по всем МО.
 * Подпись недели — прошлый Пн–Вс относительно даты отчёта (данные всегда за прошлую неделю).
 */
import { buildMosFromData, computeTotals } from './kpiCalculator.js';
import { getDynamicsWeekMonSun } from './dateUtils.js';

export const DEFAULT_WEEKLY_DYNAMICS_LIMIT = 5;

export function sumDynamicsFromMosData(mosData) {
  return computeTotals(buildMosFromData(mosData || [])).growth;
}

export function buildWeekPointFromReport(report, dateStr) {
  const anchor = (report && report.timestamp) || dateStr || '';
  const week = getDynamicsWeekMonSun(anchor);
  if (!week) return null;
  return {
    start: week.startIso,
    end: week.endIso,
    period: week.period,
    value: sumDynamicsFromMosData(report && report.mosData),
  };
}

/**
 * @param {Array<{ report: object, dateStr?: string }>} reportsNewestFirst
 */
export function buildWeeksDataFromReports(reportsNewestFirst) {
  const slice = (reportsNewestFirst || []).slice(0, DEFAULT_WEEKLY_DYNAMICS_LIMIT);
  return slice
    .slice()
    .reverse()
    .map((item) => {
      const point = buildWeekPointFromReport(item.report, item.dateStr);
      if (!point) return null;
      return {
        start: point.start,
        end: point.end,
        value: point.value,
      };
    })
    .filter(Boolean);
}

/** Подставить/обновить неделю динамики из загруженных МО (anchor = дата отчёта или сегодня для CSV). */
export function mergeReportDynamicsWeek(weeks, mosData, anchor) {
  const list = [...(weeks || [])];
  if (!mosData || !mosData.length) {
    return list.sort((a, b) => a.start.localeCompare(b.start));
  }
  const week = getDynamicsWeekMonSun(anchor || new Date());
  if (!week) return list;
  const point = {
    start: week.startIso,
    end: week.endIso,
    value: sumDynamicsFromMosData(mosData),
  };
  const idx = list.findIndex((w) => w.start === point.start);
  if (idx >= 0) list[idx] = point;
  else list.push(point);
  return list.sort((a, b) => a.start.localeCompare(b.start));
}

/** @deprecated используйте mergeReportDynamicsWeek */
export function mergeCurrentWeekFromMos(weeks, mosData) {
  return mergeReportDynamicsWeek(weeks, mosData, new Date());
}
