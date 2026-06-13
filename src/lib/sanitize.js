/**
 * =============================================================================
 * sanitize.js — безопасный вывод HTML в блоках «Сделано» и «Планы»
 * =============================================================================
 *
 * ЗАЧЕМ: пользователь вводит текст с разметкой (жирный, ссылки). При анонимном
 * доступе к приложению нужно не допустить произвольный HTML (XSS).
 *
 * РАЗРЕШЁННЫЕ ТЕГИ: b, strong, a, ul, li, br
 * ССЫЛКИ: только http(s) и mailto
 *
 * ГДЕ: renderHtmlContent() — Index/Viewer при отображении doneText / plansText
 *
 * ПОСЛЕ ПРАВОК: npm run build
 * =============================================================================
 */

const ALLOWED_TAGS = /^(b|strong|a|ul|li|br)$/i;
const SAFE_HREF = /^(https?:\/\/|mailto:)/i;

/** Экранирование текста перед вставкой в innerHTML */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Оставляет только разрешённые теги, остальное вырезает */
function sanitizeHtmlFragment(html) {
  if (!html) return '';
  return String(html).replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, function (match, tag) {
    const t = tag.toLowerCase();
    if (!ALLOWED_TAGS.test(t)) return '';
    if (match.startsWith('</')) return '</' + t + '>';
    if (t === 'br') return '<br>';
    if (t === 'a') {
      const hrefMatch = match.match(/href\s*=\s*["']([^"']+)["']/i);
      const href = hrefMatch ? hrefMatch[1] : '';
      if (!SAFE_HREF.test(href)) return '';
      return '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">';
    }
    return '<' + t + '>';
  });
}

/**
 * Готовый HTML для карточек «Сделано» / «Планы».
 * Переносы строк → <br>, если пользователь не вставил свои теги.
 */
function renderHtmlContent(text) {
  if (!text || String(text).trim() === '') return '—';
  let safe = sanitizeHtmlFragment(String(text));
  if (!safe.includes('<br') && !safe.includes('<li')) {
    safe = escapeHtml(safe).replace(/\n/g, '<br>');
  }
  return safe;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeHtml, sanitizeHtmlFragment, renderHtmlContent };
}
