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
