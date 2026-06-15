/**
 * =============================================================================
 * constants.js — плановые константы для клиента (браузер)
 * =============================================================================
 *
 * Источник истины для PLAN_YEAR / PLAN_WEEKLY / PLAN_THRESHOLD — config.js на сервере.
 * Сервер передаёт значения в браузер через getClientConfigJson() → window.CONFIG.
 *
 * getPlans() — запасной вариант, если CONFIG ещё не подгрузился (тесты, fallback).
 *
 * ПОСЛЕ ПРАВОК: npm run build
 * =============================================================================
 */
export function getPlans(config) {
  const cfg = config || (typeof CONFIG !== 'undefined' ? CONFIG : null);
  if (cfg && cfg.plans) {
    return {
      year: cfg.plans.year,
      weekly: cfg.plans.weekly,
      threshold: cfg.plans.threshold,
    };
  }
  // Значения по умолчанию совпадают с config.js
  return { year: 220000, weekly: 4583, threshold: 70 };
}
