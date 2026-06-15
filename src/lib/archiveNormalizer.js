/**
 * =============================================================================
 * archiveNormalizer.js — единый формат отчёта из листа «Архив»
 * =============================================================================
 *
 * В Google Таблице в колонке «Данные (JSON)» хранится объект отчёта.
 * Исторически поле МО могло называться mosData, MOSData или data — здесь
 * всё приводится к report.mosData (массив).
 *
 * Схема полей: docs/archive-schema.json
 *
 * ПОСЛЕ ПРАВОК: npm run build → npm test (tests/archiveNormalizer.test.js)
 * =============================================================================
 */
export function normalizeArchiveReport(report) {
  if (!report || typeof report !== 'object') return null;

  const normalized = Object.assign({}, report);

  // Поддержка старых имён поля и JSON-строки вместо массива
  let mos = normalized.mosData || normalized.MOSData || normalized.data;
  if (typeof mos === 'string') {
    try {
      mos = JSON.parse(mos);
    } catch (_e) {
      mos = [];
    }
  }
  if (!Array.isArray(mos)) mos = [];

  normalized.mosData = mos;
  return normalized;
}
