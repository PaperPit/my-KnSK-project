import { describe, it, expect } from 'vitest';
import { sortMoHistoryPoints, mergeDisplayedMoPoint } from '../src/lib/moHistory.js';

const mo = {
  fact: 100,
  plan: 200,
  percent: 50,
  growth: 10,
  colon: 20,
  hasDev: 30,
  noDev: 70,
  zno: 2,
};

describe('sortMoHistoryPoints', () => {
  it('sorts by reportId ascending', () => {
    const sorted = sortMoHistoryPoints([
      { reportId: 3, dateStr: 'c' },
      { reportId: 1, dateStr: 'a' },
      { reportId: 2, dateStr: 'b' },
    ]);
    expect(sorted.map((p) => p.reportId)).toEqual([1, 2, 3]);
  });
});

describe('mergeDisplayedMoPoint', () => {
  it('keeps chronological order when viewing an archive report already in history', () => {
    const history = [
      { reportId: 1, fact: 80, percent: 40, growth: 5, colon: 10, hasDev: 15, noDev: 65, zno: 1, coverage: 66 },
      { reportId: 2, fact: 90, percent: 45, growth: 10, colon: 12, hasDev: 18, noDev: 72, zno: 1, coverage: 66 },
      { reportId: 3, fact: 100, percent: 50, growth: 10, colon: 20, hasDev: 30, noDev: 70, zno: 2, coverage: 66 },
    ];

    const merged = mergeDisplayedMoPoint(history, mo, {
      archiveReportId: 1,
      period: 'p1',
    });

    expect(merged.map((p) => p.reportId)).toEqual([1, 2, 3]);
    expect(merged[0].fact).toBe(100);
    expect(merged[2].fact).toBe(100);
  });

  it('does not append duplicate draft at the end', () => {
    const history = [{ reportId: 1, fact: 100, percent: 50, growth: 0, colon: 0, hasDev: 0, noDev: 0, zno: 0 }];
    const merged = mergeDisplayedMoPoint(history, mo, { period: 'draft' });
    expect(merged).toHaveLength(1);
  });

  it('appends unsaved draft after archive points', () => {
    const history = [
      { reportId: 1, fact: 80, percent: 40, growth: 5, colon: 10, hasDev: 15, noDev: 65, zno: 1 },
      { reportId: 2, fact: 90, percent: 45, growth: 10, colon: 12, hasDev: 18, noDev: 72, zno: 1 },
    ];
    const draft = { ...mo, fact: 200, percent: 80 };
    const merged = mergeDisplayedMoPoint(history, draft, { period: 'черновик' });
    expect(merged.map((p) => p.reportId)).toEqual([1, 2, 999999]);
    expect(merged[2].fact).toBe(200);
  });
});
