/**
 * moHistory.js — хронологическая история точек МО для глубокого анализа
 */

export function sortMoHistoryPoints(points) {
  return [...(points || [])].sort(function (a, b) {
    const idA = Number(a.reportId);
    const idB = Number(b.reportId);
    if (!isNaN(idA) && !isNaN(idB) && idA !== idB) return idA - idB;
    return String(a.dateStr || '').localeCompare(String(b.dateStr || ''), 'ru');
  });
}

export function buildMoHistoryPoint(mo, reportId, period, dateStr) {
  const hasDev = mo.hasDev || 0;
  const colon = mo.colon || 0;
  return {
    reportId,
    dateStr: dateStr || '',
    period: period || '',
    fact: mo.fact,
    plan: mo.plan,
    percent: mo.percent,
    growth: mo.growth,
    colon,
    hasDev,
    noDev: mo.noDev,
    zno: mo.zno,
    coverage: hasDev > 0 ? (colon / hasDev) * 100 : 0,
  };
}

/**
 * Встраивает на экране отображаемую точку МО в историю архива без нарушения порядка.
 * archiveReportId — ID выбранного отчёта из архива; без него точка считается черновиком (в конце).
 */
export function mergeDisplayedMoPoint(history, mo, options) {
  const list = history || [];
  if (!mo) return sortMoHistoryPoints(list);

  const opts = options || {};
  const archiveReportId = opts.archiveReportId;
  const hasArchiveId =
    archiveReportId != null && archiveReportId !== '' && !isNaN(Number(archiveReportId));
  const reportId = hasArchiveId ? Number(archiveReportId) : 999999;
  const point = buildMoHistoryPoint(mo, reportId, opts.period, opts.dateStr);

  if (hasArchiveId) {
    const idx = list.findIndex(function (p) {
      return Number(p.reportId) === Number(archiveReportId);
    });
    if (idx >= 0) {
      const next = list.slice();
      next[idx] = Object.assign({}, next[idx], point, { reportId: Number(archiveReportId) });
      return sortMoHistoryPoints(next);
    }
    return sortMoHistoryPoints(list.concat([point]));
  }

  const last = list[list.length - 1];
  if (last && Math.abs(last.percent - point.percent) < 0.01 && last.fact === point.fact) {
    return sortMoHistoryPoints(list);
  }
  return sortMoHistoryPoints(list.concat([point]));
}
