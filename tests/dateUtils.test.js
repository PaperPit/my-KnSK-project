import { describe, it, expect } from 'vitest';
import { formatShortDate, getNextWeekPeriod } from '../src/lib/dateUtils.js';

describe('formatShortDate', () => {
  it('formats ISO date as dd.mm', () => {
    expect(formatShortDate('2026-01-13')).toBe('13.01');
    expect(formatShortDate('2026-09-05T10:00:00')).toBe('05.09');
  });

  it('pads single-digit day and month', () => {
    expect(formatShortDate('2026-01-05')).toBe('05.01');
  });

  it('returns empty string for falsy input', () => {
    expect(formatShortDate('')).toBe('');
    expect(formatShortDate(null)).toBe('');
    expect(formatShortDate(undefined)).toBe('');
  });
});

describe('getNextWeekPeriod', () => {
  it('returns a display string in dd.mm - dd.mm format', () => {
    const p = getNextWeekPeriod();
    expect(p.display).toMatch(/^\d{2}\.\d{2} - \d{2}\.\d{2}$/);
  });

  it('returns start and end Date objects (Friday = Monday + 4 days)', () => {
    const p = getNextWeekPeriod();
    expect(p.start).toBeInstanceOf(Date);
    expect(p.end).toBeInstanceOf(Date);
    const diffDays = Math.round((p.end - p.start) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(4);
  });
});
