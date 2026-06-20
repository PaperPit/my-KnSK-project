/**
 * =============================================================================
 * dateUtils.js — форматирование дат и расчёт недель (общий для editor/viewer)
 * =============================================================================
 *
 * Раньше formatDate и getNextWeekPeriod дублировались в editor.js и viewer.js
 * (байт-идентичны). Вынесены сюда как единый источник истины.
 *
 * ПОСЛЕ ПРАВОК: npm run build → npm test (tests/dateUtils.test.js)
 * =============================================================================
 */

/** dd.mm из даты/строки ISO — для подписей недель на графиках */
export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Диапазон следующей рабочей недели (Пн–Пт) от сегодня.
 * Возвращает { display: 'dd.mm - dd.mm', start, end }.
 */
export function getNextWeekPeriod() {
  const today = new Date();
  const nextMonday = new Date(today);
  const day = today.getDay();
  let daysUntilMonday = day === 0 ? 1 : 8 - day;
  if (day === 1) daysUntilMonday = 0;
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  const nextFriday = new Date(nextMonday);
  nextFriday.setDate(nextMonday.getDate() + 4);
  const fmt = (d) =>
    `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
  return {
    display: `${fmt(nextMonday)} - ${fmt(nextFriday)}`,
    start: nextMonday,
    end: nextFriday,
  };
}

/**
 * Короткая подпись периода: одна конечная дата (например 17.04.2026).
 */
export function parseArchiveReportDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  const dmY = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (dmY) {
    return new Date(Number(dmY[3]), Number(dmY[2]) - 1, Number(dmY[1])).getTime();
  }
  const parsed = Date.parse(s);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Первый отчёт должен быть хронологически раньше второго.
 * @param {number} idEarlier — compareSelectA
 * @param {number} idLater — compareSelectB
 * @param {Array<{id: number, dateStr?: string}>} reportsList
 */
export function isEarlierArchiveReport(idEarlier, idLater, reportsList) {
  const a = Number(idEarlier);
  const b = Number(idLater);
  if (!a || !b || a === b) return false;

  const list = reportsList || [];
  const metaA = list.find((r) => r.id === a);
  const metaB = list.find((r) => r.id === b);
  const timeA = metaA && parseArchiveReportDate(metaA.dateStr);
  const timeB = metaB && parseArchiveReportDate(metaB.dateStr);
  if (timeA != null && timeB != null) return timeA < timeB;
  return a < b;
}

/**
 * Календарная неделя Пн–Вс для даты отчёта.
 * @returns {{ startIso: string, endIso: string, period: string }|null}
 */
export function getCalendarWeekMonSun(anchor) {
  let d;
  if (anchor instanceof Date) {
    d = new Date(anchor.getTime());
  } else if (typeof anchor === 'number') {
    d = new Date(anchor);
  } else if (typeof anchor === 'string') {
    const parsed = parseArchiveReportDate(anchor);
    d = parsed != null ? new Date(parsed) : new Date(anchor);
  } else {
    return null;
  }
  if (isNaN(d.getTime())) return null;

  const day = d.getDay();
  const daysToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const pad = (n) => String(n).padStart(2, '0');
  const iso = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const ddmm = (dt) => `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}`;

  return {
    startIso: iso(monday),
    endIso: iso(sunday),
    period: `${ddmm(monday)}-${ddmm(sunday)}`,
    monday,
    sunday,
  };
}

/**
 * Неделя Пн–Вс, за которую в отчёте указана «Динамика» (всегда прошлая к дате отчёта).
 */
export function getDynamicsWeekMonSun(anchor) {
  const week = getCalendarWeekMonSun(anchor);
  if (!week) return null;

  const monday = new Date(week.monday);
  monday.setDate(monday.getDate() - 7);
  const sunday = new Date(week.sunday);
  sunday.setDate(sunday.getDate() - 7);

  const pad = (n) => String(n).padStart(2, '0');
  const iso = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const ddmm = (dt) => `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}`;

  return {
    startIso: iso(monday),
    endIso: iso(sunday),
    period: `${ddmm(monday)}-${ddmm(sunday)}`,
    monday,
    sunday,
  };
}

export function formatPeriodLabel(period) {
  if (!period) return '';
  let s = String(period).trim();

  s = s.replace(
    /^[\s«"'„]*Масштабирование\s+онкоскрининговых\s+исследований[\s»"'"]*/i,
    ''
  );
  s = s.trim();

  const rangeMatch = s.match(/(\d{2}\.\d{2}\.\d{4})\s*[-–—]\s*(\d{2}\.\d{2}\.\d{4})/);
  if (rangeMatch) return rangeMatch[2];

  const singleMatch = s.match(/(\d{2}\.\d{2}\.\d{4})/);
  if (singleMatch) return singleMatch[1];

  return s || String(period).trim();
}
