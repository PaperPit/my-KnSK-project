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

/** Есть ли в строке разрешённая разметка после санитизации */
function hasAllowedMarkup(html) {
  return /<(b|strong|a|ul|li|br)\b/i.test(html);
}

/** Оставляет только разрешённые теги, остальное вырезает */
function sanitizeHtmlFragment(html) {
  if (!html) return '';
  let out = String(html);

  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  out = out.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, function (match, tag) {
    const t = tag.toLowerCase();
    if (t === 'a') return match;
    if (!ALLOWED_TAGS.test(t)) return '';
    if (match.startsWith('</')) return '</' + t + '>';
    if (t === 'br') return '<br>';
    return '<' + t + '>';
  });

  out = out.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, function (_match, attrs, inner) {
    const hrefMatch = attrs.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const href = hrefMatch ? hrefMatch[1] || hrefMatch[2] : '';
    if (!SAFE_HREF.test(href)) return sanitizeHtmlFragment(inner);
    return (
      '<a href="' +
      escapeHtml(href) +
      '" target="_blank" rel="noopener noreferrer">' +
      sanitizeHtmlFragment(inner) +
      '</a>'
    );
  });

  return out;
}

/**
 * Готовый HTML для карточек «Сделано» / «Планы».
 * Переносы строк → <br>, если пользователь не вставил свои теги.
 */
function renderHtmlContent(text) {
  if (!text || String(text).trim() === '') return '—';
  const raw = String(text);
  const safe = sanitizeHtmlFragment(raw);

  if (hasAllowedMarkup(safe)) {
    if (!/<br\b/i.test(safe) && !/<li\b/i.test(safe)) {
      return safe.replace(/\n/g, '<br>');
    }
    return safe;
  }

  return escapeHtml(raw).replace(/\n/g, '<br>');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeHtml, sanitizeHtmlFragment, renderHtmlContent };
}
