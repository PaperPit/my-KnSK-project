/**
 * Клиентский кэш точек графика «Динамика КнСК» — один запрос на сессию.
 */
let cachedWeeks = null;
let inflight = null;

export function getWeeksTrendCache() {
  return cachedWeeks;
}

export function setWeeksTrendCache(weeks) {
  cachedWeeks = Array.isArray(weeks) ? weeks : null;
}

export function invalidateWeeksTrendCache() {
  cachedWeeks = null;
  inflight = null;
}

export function fetchWeeksTrend(gasAdapter, limit) {
  if (cachedWeeks) return Promise.resolve(cachedWeeks);
  if (inflight) return inflight;
  if (!gasAdapter || !gasAdapter.originalRun) {
    return Promise.resolve([]);
  }
  inflight = gasAdapter
    .call('getWeeklyDynamicsTrend', { params: [limit] })
    .then(function (weeks) {
      cachedWeeks = weeks || [];
      inflight = null;
      return cachedWeeks;
    })
    .catch(function (err) {
      inflight = null;
      throw err;
    });
  return inflight;
}
