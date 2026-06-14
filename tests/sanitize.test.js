import { describe, expect, it } from 'vitest';
import { escapeHtml, renderHtmlContent, sanitizeHtmlFragment } from '../src/lib/sanitize.js';

describe('sanitizeHtmlFragment', () => {
  it('сохраняет strong и ссылки с target', () => {
    const html = '<strong>Важно</strong> и <a href="https://example.com" target="_blank">ссылка</a>';
    expect(sanitizeHtmlFragment(html)).toBe(
      '<strong>Важно</strong> и <a href="https://example.com" target="_blank" rel="noopener noreferrer">ссылка</a>'
    );
  });

  it('удаляет опасные теги', () => {
    expect(sanitizeHtmlFragment('<script>alert(1)</script>текст')).toBe('текст');
  });

  it('отклоняет небезопасные href, оставляя текст', () => {
    expect(sanitizeHtmlFragment('<a href="javascript:alert(1)">x</a>')).toBe('x');
  });
});

describe('renderHtmlContent', () => {
  it('рендерит жирный текст как HTML', () => {
    expect(renderHtmlContent('Сделано: <strong>отчёт</strong>')).toBe(
      'Сделано: <strong>отчёт</strong>'
    );
  });

  it('рендерит гиперссылки как кликабельные', () => {
    expect(renderHtmlContent('<a href="https://med.ru/doc">документ</a>')).toBe(
      '<a href="https://med.ru/doc" target="_blank" rel="noopener noreferrer">документ</a>'
    );
  });

  it('экранирует обычный текст и сохраняет переносы', () => {
    expect(renderHtmlContent('строка 1\nстрока 2')).toBe('строка 1<br>строка 2');
  });

  it('сохраняет переносы внутри разметки', () => {
    expect(renderHtmlContent('<strong>первая\nвторая</strong>')).toBe(
      '<strong>первая<br>вторая</strong>'
    );
  });

  it('возвращает тире для пустого текста', () => {
    expect(renderHtmlContent('   ')).toBe('—');
  });

  it('экранирует угловые скобки в plain text', () => {
    expect(renderHtmlContent('a < b > c')).toBe('a &lt; b &gt; c');
  });
});

describe('escapeHtml', () => {
  it('экранирует спецсимволы', () => {
    expect(escapeHtml('<a & "b">')).toBe('&lt;a &amp; &quot;b&quot;&gt;');
  });
});
