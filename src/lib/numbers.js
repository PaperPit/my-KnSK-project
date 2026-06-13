/**
 * =============================================================================
 * numbers.js — разбор чисел из CSV и архива
 * =============================================================================
 *
 * ГДЕ ИСПОЛЬЗУЕТСЯ:
 *   Собирается в LibBundle.html → window.KnSKLib
 *   Вызывается из kpiCalculator.js, dashboardPhase1, тестов tests/numbers.test.js
 *
 * КОГДА ПРАВИТЬ:
 *   Если в выгрузке появились новые форматы чисел (скобки, пробелы, знаки +/−).
 *   Примеры из реальных данных: "6052 (97%)", "+1 234", "-", "3 200 (+64%)"
 *
 * ПОСЛЕ ПРАВОК: npm run build → clasp push
 * =============================================================================
 */

/** Динамика и целые с опциональным знаком и суффиксом в скобках */
function extractNumber(v) {
  if (!v) return 0;
  let s = String(v).trim();
  if (s === '-' || s === '') return 0;
  let sign = 1;
  if (s.startsWith('+')) s = s.substring(1);
  else if (s.startsWith('-')) {
    sign = -1;
    s = s.substring(1);
  }
  // Берём цифры до скобки или конца: "6052 (97%)" → 6052
  const m = s.match(/^(\d+[\d\s]*?)(?:\s*\(|$)/);
  if (m) return sign * (parseInt(m[1].replace(/\s/g, ''), 10) || 0);
  return sign * (parseInt(s, 10) || 0);
}

/** Факт КнСК из колонки «Общий итог» — первая группа цифр в строке */
function extractFact(v) {
  if (!v) return 0;
  const m = String(v).match(/(\d[\d\s]*)/);
  return m ? parseInt(m[1].replace(/\s/g, ''), 10) : 0;
}

/**
 * Универсальное приведение к числу (архив JSON, смешанные типы).
 * Сначала extractNumber, если 0 — пробуем extractFact.
 */
function toNum(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number' && !isNaN(v)) return v;
  const n = extractNumber(v);
  if (n !== 0) return n;
  return extractFact(v);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { extractNumber, extractFact, toNum };
}
