import { describe, it, expect } from 'vitest';
import { formatShortDate, getNextWeekPeriod, formatPeriodLabel } from '../src/lib/dateUtils.js';

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

describe('formatPeriodLabel', () => {
  it('strips quoted prefix and returns end date only', () => {
    expect(
      formatPeriodLabel('«Масштабирование онкоскрининговых исследований» 01.01.2026 - 17.04.2026')
    ).toBe('17.04.2026');
    expect(
      formatPeriodLabel('Масштабирование онкоскрининговых исследований 01.01.2026 - 10.01.2026')
    ).toBe('10.01.2026');
    expect(formatPeriodLabel('01.01.2026 - 17.01.2026')).toBe('17.01.2026');
  });

  it('returns single date when no range', () => {
    expect(formatPeriodLabel('17.04.2026')).toBe('17.04.2026');
  });

  it('returns trimmed original when no date found', () => {
    expect(formatPeriodLabel('  Текущий отчёт  ')).toBe('Текущий отчёт');
  });

  it('returns empty string for falsy input', () => {
    expect(formatPeriodLabel('')).toBe('');
    expect(formatPeriodLabel(null)).toBe('');
  });
});
