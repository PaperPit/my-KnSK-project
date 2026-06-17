import { describe, it, expect } from 'vitest';
import { icon } from '../src/lib/icons.js';

describe('icons', () => {
  it('renders svg use for sprite icon', () => {
    const html = icon('archive');
    expect(html).toContain('<svg class="knsk-icon"');
    expect(html).toContain('href="#icon-archive"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('supports extra class and inline style', () => {
    const html = icon('trophy', { className: 'knsk-icon--sm', style: 'color:#f39c12' });
    expect(html).toContain('class="knsk-icon knsk-icon--sm"');
    expect(html).toContain('style="color:#f39c12"');
    expect(html).toContain('#icon-trophy');
  });

  it('returns empty string for missing name', () => {
    expect(icon('')).toBe('');
  });
});
