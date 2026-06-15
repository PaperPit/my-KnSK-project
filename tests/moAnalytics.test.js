import { describe, it, expect } from 'vitest';
import {
  normalizeMoKey,
  computeMoRankings,
  detectMoTrend,
  buildMoInsights,
  rankBadgeClass,
} from '../src/lib/moAnalytics.js';

const mos = [
  { name: 'ГКБ №1', plan: 5000, fact: 4000, percent: 80, growth: 150, colon: 400, hasDev: 800, zno: 5, noDev: 100 },
  { name: 'ПКБ', plan: 4000, fact: 2000, percent: 50, growth: 80, colon: 200, hasDev: 400, zno: 3, noDev: 50 },
  { name: 'ЦРБ', plan: 3000, fact: 2700, percent: 90, growth: 200, colon: 350, hasDev: 600, zno: 4, noDev: 80 },
];

describe('normalizeMoKey', () => {
  it('trims and lowercases', () => {
    expect(normalizeMoKey('  ГКБ №1 ')).toBe('гкб №1');
  });
});

describe('computeMoRankings', () => {
  it('ranks MO by percent', () => {
    const r = computeMoRankings('ЦРБ', mos);
    expect(r.byPercent).toBe(1);
    expect(r.total).toBe(3);
    expect(r.coverage).toBeCloseTo((350 / 600) * 100, 1);
  });

  it('returns null ranks when MO missing', () => {
    const r = computeMoRankings('Нет такой', mos);
    expect(r.mo).toBeNull();
    expect(r.byPercent).toBeNull();
  });
});

describe('detectMoTrend', () => {
  it('detects upward trend', () => {
    const history = [{ percent: 50 }, { percent: 55 }, { percent: 62 }, { percent: 70 }];
    expect(detectMoTrend(history, 'percent')).toBe('up');
  });

  it('detects stable trend', () => {
    const history = [{ percent: 70 }, { percent: 70.2 }, { percent: 70.1 }];
    expect(detectMoTrend(history, 'percent')).toBe('stable');
  });
});

describe('buildMoInsights', () => {
  it('returns insights for MO above threshold', () => {
    const rankings = computeMoRankings('ГКБ №1', mos);
    const insights = buildMoInsights(mos[0], [{ percent: 70 }, { percent: 80 }], rankings, {
      plans: { threshold: 70, weekly: 4583, year: 220000 },
    });
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some((i) => i.text.includes('план'))).toBe(true);
  });
});

describe('rankBadgeClass', () => {
  it('returns top for leading position', () => {
    expect(rankBadgeClass(1, 48)).toBe('mo-profile-rank-badge--top');
  });
});
