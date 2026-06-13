import { describe, it, expect } from 'vitest';
import { extractNumber, extractFact, toNum } from '../src/lib/numbers.js';

describe('extractNumber', () => {
  it('returns 0 for empty values', () => {
    expect(extractNumber('')).toBe(0);
    expect(extractNumber(null)).toBe(0);
    expect(extractNumber('-')).toBe(0);
  });

  it('parses plain integers', () => {
    expect(extractNumber('120')).toBe(120);
    expect(extractNumber('+95')).toBe(95);
    expect(extractNumber('-42')).toBe(-42);
  });

  it('parses numbers with spaces and parenthetical suffix', () => {
    expect(extractNumber('3 200 (+64%)')).toBe(3200);
    expect(extractNumber('6 052 (97%)')).toBe(6052);
  });
});

describe('extractFact', () => {
  it('extracts first numeric group from fact strings', () => {
    expect(extractFact('3200 (+64%)')).toBe(3200);
    expect(extractFact('2 800 (67%)')).toBe(2800);
  });

  it('returns 0 when no digits', () => {
    expect(extractFact('')).toBe(0);
    expect(extractFact('n/a')).toBe(0);
  });
});

describe('toNum', () => {
  it('passes through numbers', () => {
    expect(toNum(42)).toBe(42);
    expect(toNum(0)).toBe(0);
  });

  it('delegates to extractNumber then extractFact', () => {
    expect(toNum('3 200 (+64%)')).toBe(3200);
    expect(toNum('')).toBe(0);
  });
});
