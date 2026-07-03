/**
 * =============================================================================
 * chartTheme.js — единая палитра графиков (Chart.js / ECharts)
 * =============================================================================
 *
 * Источник истины — CSS-переменные --chart-* в src/ui/tokens.css.
 * В окружении без DOM (тесты, сборка) возвращаются фолбэки — те же значения.
 *
 * ПОСЛЕ ПРАВОК: npm run build
 * =============================================================================
 */

export const CHART_FALLBACK_COLORS = {
  primary: '#2c7da0', // основная серия (факт, охват)
  target: '#e67e22', // план / цель
  positive: '#1f8a4c', // рост, топ
  negative: '#c0392b', // снижение, антитоп
  accent: '#e9b35f', // акцентная вторая серия
  line: '#1f6392', // линия тренда
  ink: '#0f172a', // подписи данных
  muted: '#334155', // подписи осей
  grid: 'rgba(148, 163, 184, 0.25)',
};

/** Цвет палитры графиков: CSS-переменная --chart-<name> либо фолбэк. */
export function chartColor(name) {
  const fallback = CHART_FALLBACK_COLORS[name] || '#64748b';
  if (
    typeof window === 'undefined' ||
    typeof getComputedStyle !== 'function' ||
    typeof document === 'undefined' ||
    !document.documentElement
  ) {
    return fallback;
  }
  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--chart-' + name)
      .trim();
    return value || fallback;
  } catch (_e) {
    return fallback;
  }
}
