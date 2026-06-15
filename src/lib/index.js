/**
 * =============================================================================
 * index.js — barrel-файл общей библиотеки KnSK
 * =============================================================================
 *
 * Единая точка импорта для клиентских модулей:
 *   import { escapeHtml, buildMosFromData, formatShortDate } from '../lib/index.js';
 *
 * ПОСЛЕ ПРАВОК: npm run build → npm test
 * =============================================================================
 */
export * from './numbers.js';
export * from './sanitize.js';
export * from './csvParser.js';
export * from './archiveNormalizer.js';
export * from './constants.js';
export * from './kpiCalculator.js';
export * from './dateUtils.js';
export * from './moUtils.js';
