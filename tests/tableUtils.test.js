import { describe, it, expect } from 'vitest';
import {
  sortMosForTable,
  defaultSortDir,
  buildTableCsv,
  TABLE_SORT_COLUMNS,
} from '../src/lib/tableUtils.js';

const mos = [
  { name: 'Больница Б', plan: 100, fact: 50, percent: 50, growth: 5, noDev: 30, hasDev: 20, colon: 10, zno: 1 },
  { name: 'Амбулатория А', plan: 200, fact: 180, percent: 90, growth: -2, noDev: 100, hasDev: 80, colon: 60, zno: 3 },
  { name: 'Центр В', plan: 300, fact: 150, percent: 50, growth: 10, noDev: 90, hasDev: 60, colon: 30, zno: 2 },
];

describe('sortMosForTable', () => {
  it('sorts numbers desc/asc', () => {
    expect(sortMosForTable(mos, 'fact', 'desc').map((m) => m.fact)).toEqual([180, 150, 50]);
    expect(sortMosForTable(mos, 'fact', 'asc').map((m) => m.fact)).toEqual([50, 150, 180]);
  });

  it('sorts names alphabetically (ru)', () => {
    expect(sortMosForTable(mos, 'name', 'asc').map((m) => m.name)).toEqual([
      'Амбулатория А',
      'Больница Б',
      'Центр В',
    ]);
  });

  it('breaks ties by name for stability', () => {
    const sorted = sortMosForTable(mos, 'percent', 'desc');
    expect(sorted[0].name).toBe('Амбулатория А');
    // при равных 50% — по алфавиту
    expect(sorted.slice(1).map((m) => m.name)).toEqual(['Больница Б', 'Центр В']);
  });

  it('falls back to percent for unknown key and does not mutate input', () => {
    const copy = [...mos];
    const sorted = sortMosForTable(mos, 'nope', 'desc');
    expect(sorted[0].percent).toBe(90);
    expect(mos).toEqual(copy);
  });

  it('defaultSortDir: asc only for strings', () => {
    expect(defaultSortDir('name')).toBe('asc');
    expect(defaultSortDir('fact')).toBe('desc');
  });

  it('every sort column is covered', () => {
    Object.keys(TABLE_SORT_COLUMNS).forEach((key) => {
      expect(() => sortMosForTable(mos, key, 'asc')).not.toThrow();
    });
  });
});

describe('buildTableCsv', () => {
  it('builds semicolon-separated rows with header', () => {
    const csv = buildTableCsv([mos[0]]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Наименование МО');
    expect(lines[1]).toBe('1;Больница Б;100;50;50,0;5;30;20;10;1');
  });

  it('escapes separators and quotes in names', () => {
    const csv = buildTableCsv([{ ...mos[0], name: 'МО; с "кавычками"' }]);
    expect(csv.split('\r\n')[1]).toContain('"МО; с ""кавычками"""');
  });

  it('handles empty input', () => {
    const csv = buildTableCsv([]);
    expect(csv.split('\r\n')).toHaveLength(1);
  });
});
