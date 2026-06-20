import { describe, it, expect } from 'vitest';
import {
  normalizeMoKey,
  computeMoRankings,
  computeTopColonCoverageGainers,
  computeLowCoverageStagnantMOs,
  computeHighCoverageTopDynamicsMOs,
  isMinimalCoverageDynamics,
  COLON_COVERAGE_LOW_THRESHOLD,
  computeHighVolumeLowPositiveOutliers,
  positiveRateOf,
  KNSK_HIGH_VOLUME_MIN_FACT,
  KNSK_POSITIVE_RATE_Z_THRESHOLD,
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

describe('computeTopColonCoverageGainers', () => {
  const earlier = [
    { name: 'МО А', colon: 15, hasDev: 100 },
    { name: 'МО Б', colon: 30, hasDev: 100 },
    { name: 'МО В', colon: 50, hasDev: 100 },
  ];
  const later = [
    { name: 'МО А', colon: 45, hasDev: 100 },
    { name: 'МО Б', colon: 32, hasDev: 100 },
    { name: 'МО В', colon: 52, hasDev: 100 },
  ];

  it('ranks by relative coverage growth and rank rise', () => {
    const top = computeTopColonCoverageGainers(earlier, later, { minHasDev: 10, limit: 5 });
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].name).toBe('МО А');
    expect(top[0].relativePctGrowth).toBeCloseTo(200, 0);
    expect(top[0].rankRise).toBe(1);
    expect(top[0].colonDelta).toBe(30);
    expect(top[0].colonLater).toBe(45);
  });

  it('skips MO without positive coverage dynamics', () => {
    const flat = [{ name: 'МО А', colon: 20, hasDev: 100 }];
    const down = [{ name: 'МО А', colon: 10, hasDev: 100 }];
    expect(computeTopColonCoverageGainers(flat, down)).toEqual([]);
  });
});

describe('computeLowCoverageStagnantMOs', () => {
  const earlier = [
    { name: 'МО А', colon: 20, hasDev: 100 },
    { name: 'МО Б', colon: 10, hasDev: 100 },
    { name: 'МО В', colon: 60, hasDev: 100 },
    { name: 'МО Г', colon: 15, hasDev: 100 },
  ];
  const later = [
    { name: 'МО А', colon: 22, hasDev: 110 },
    { name: 'МО Б', colon: 10, hasDev: 100 },
    { name: 'МО В', colon: 80, hasDev: 100 },
    { name: 'МО Г', colon: 12, hasDev: 100 },
  ];

  it('returns MO with low coverage and no or minimal dynamics', () => {
    const result = computeLowCoverageStagnantMOs(earlier, later, { minHasDev: 10, limit: 5 });
    expect(result.map((m) => m.name)).toEqual(['МО Б', 'МО Г', 'МО А']);
    expect(result[0].coverageLater).toBe(10);
    expect(result[0].coverageDeltaPp).toBe(0);
  });

  it('sorts by later-period coverage ascending', () => {
    const result = computeLowCoverageStagnantMOs(earlier, later, { minHasDev: 10, limit: 5 });
    const coverages = result.map((m) => m.coverageLater);
    expect(coverages).toEqual([...coverages].sort((a, b) => a - b));
    expect(coverages).toEqual([10, 12, 20]);
  });

  it('excludes MO with high coverage or strong growth', () => {
    const result = computeLowCoverageStagnantMOs(earlier, later, { minHasDev: 10, limit: 5 });
    expect(result.some((m) => m.name === 'МО В')).toBe(false);
  });

  it('includes MO with minimal positive dynamics relative to pool', () => {
    const early = [{ name: 'МО X', colon: 0, hasDev: 42 }];
    const late = [{ name: 'МО X', colon: 2, hasDev: 49 }];
    const result = computeLowCoverageStagnantMOs(early, late, { minHasDev: 10, limit: 5 });
    expect(result).toHaveLength(1);
    expect(result[0].coverageDeltaPp).toBeCloseTo(4.08, 1);
  });

  it('excludes MO with above-median positive dynamics among low-coverage peers', () => {
    const earlier = [
      { name: 'МО X', colon: 0, hasDev: 40 },
      { name: 'МО Y', colon: 5, hasDev: 40 },
    ];
    const later = [
      { name: 'МО X', colon: 2, hasDev: 50 },
      { name: 'МО Y', colon: 20, hasDev: 50 },
    ];
    const result = computeLowCoverageStagnantMOs(earlier, later, { minHasDev: 10, limit: 5 });
    expect(result.map((m) => m.name)).toEqual(['МО X']);
  });

  it('respects coverage threshold', () => {
    const lowOnly = [{ name: 'МО X', colon: 5, hasDev: 100 }];
    const lowOnlyLater = [{ name: 'МО X', colon: 5, hasDev: 100 }];
    const result = computeLowCoverageStagnantMOs(lowOnly, lowOnlyLater, {
      maxCoverage: COLON_COVERAGE_LOW_THRESHOLD,
    });
    expect(result).toHaveLength(1);
    expect(result[0].coverageLater).toBe(5);
  });
});

describe('isMinimalCoverageDynamics', () => {
  it('treats non-positive delta as minimal', () => {
    expect(isMinimalCoverageDynamics(0, [0, 2, 5])).toBe(true);
    expect(isMinimalCoverageDynamics(-1.5, [0, 2, 5])).toBe(true);
  });

  it('allows positive delta up to pool median', () => {
    expect(isMinimalCoverageDynamics(1, [-1, 0, 2, 5])).toBe(true);
    expect(isMinimalCoverageDynamics(2, [-1, 0, 2, 5])).toBe(false);
    expect(isMinimalCoverageDynamics(6, [0, 2, 5, 8])).toBe(false);
  });
});

describe('computeHighCoverageTopDynamicsMOs', () => {
  const earlier = [
    { name: 'МО А', colon: 50, hasDev: 100 },
    { name: 'МО Б', colon: 45, hasDev: 100 },
    { name: 'МО В', colon: 10, hasDev: 100 },
  ];
  const later = [
    { name: 'МО А', colon: 70, hasDev: 100 },
    { name: 'МО Б', colon: 55, hasDev: 100 },
    { name: 'МО В', colon: 12, hasDev: 100 },
  ];

  it('returns high-coverage MOs sorted by best positive dynamics', () => {
    const result = computeHighCoverageTopDynamicsMOs(earlier, later, { minHasDev: 10, limit: 5 });
    expect(result.map((m) => m.name)).toEqual(['МО А', 'МО Б']);
    expect(result[0].coverageDeltaPp).toBeCloseTo(20, 1);
    expect(result[0].coverageLater).toBe(70);
  });

  it('excludes low coverage and non-positive dynamics', () => {
    const result = computeHighCoverageTopDynamicsMOs(earlier, later, { minHasDev: 10, limit: 5 });
    expect(result.some((m) => m.name === 'МО В')).toBe(false);
  });
});

describe('computeHighVolumeLowPositiveOutliers', () => {
  const mos = [
    { name: 'МО А', fact: 1200, hasDev: 36, noDev: 1164 },
    { name: 'МО Б', fact: 900, hasDev: 90, noDev: 810 },
    { name: 'МО В', fact: 700, hasDev: 70, noDev: 630 },
    { name: 'МО Г', fact: 600, hasDev: 66, noDev: 534 },
    { name: 'МО Д', fact: 550, hasDev: 55, noDev: 495 },
    { name: 'МО Е', fact: 300, hasDev: 30, noDev: 270 },
  ];

  it('computes positive rate', () => {
    expect(positiveRateOf({ fact: 1000, hasDev: 50 })).toBe(5);
  });

  it('excludes MO below volume threshold', () => {
    const result = computeHighVolumeLowPositiveOutliers(mos, { limit: 5, zThreshold: -0.5 });
    expect(result.items.every((m) => m.fact >= KNSK_HIGH_VOLUME_MIN_FACT)).toBe(true);
    expect(result.items.some((m) => m.name === 'МО Е')).toBe(false);
  });

  it('prioritizes high-volume MO with low positive share', () => {
    const result = computeHighVolumeLowPositiveOutliers(mos, { limit: 3, zThreshold: -0.5 });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].name).toBe('МО А');
    expect(result.items[0].positiveRate).toBeLessThan(result.benchmark.meanPositiveRate);
    expect(result.items[0].deviationPp).toBeLessThan(0);
  });

  it('sorts by lowest positive rate first', () => {
    const result = computeHighVolumeLowPositiveOutliers(mos, { limit: 5, zThreshold: -0.5 });
    const rates = result.items.map((m) => m.positiveRate);
    expect(rates).toEqual([...rates].sort((a, b) => a - b));
  });

  it('returns benchmark stats', () => {
    const result = computeHighVolumeLowPositiveOutliers(mos, { limit: 5 });
    expect(result.benchmark.moCount).toBe(6);
    expect(result.benchmark.meanPositiveRate).toBeGreaterThan(0);
    expect(result.benchmark.networkPositiveRate).toBeGreaterThan(0);
  });

  it('uses default z threshold constant', () => {
    expect(KNSK_HIGH_VOLUME_MIN_FACT).toBe(500);
    expect(KNSK_POSITIVE_RATE_Z_THRESHOLD).toBe(-1.5);
  });
});
