import { describe, it, expect } from 'vitest';
import {
  averageWeeklyRate,
  weeksLeftInYear,
  computeKnskForecast,
  computeCoverageForecast,
  DEFAULT_COVERAGE_TARGET,
} from '../src/lib/forecast.js';

describe('averageWeeklyRate', () => {
  it('averages last points, ignoring zeros', () => {
    const weeks = [{ value: 0 }, { value: 100 }, { value: 200 }, { value: 300 }];
    expect(averageWeeklyRate(weeks)).toBe(200);
  });

  it('respects maxPoints (last N)', () => {
    const weeks = [{ value: 100 }, { value: 200 }, { value: 300 }];
    expect(averageWeeklyRate(weeks, 2)).toBe(250);
  });

  it('returns null without positive points', () => {
    expect(averageWeeklyRate([])).toBeNull();
    expect(averageWeeklyRate([{ value: 0 }])).toBeNull();
    expect(averageWeeklyRate(null)).toBeNull();
  });
});

describe('weeksLeftInYear', () => {
  it('counts weeks to Dec 31', () => {
    expect(weeksLeftInYear(new Date(2026, 11, 25))).toBe(1);
    expect(weeksLeftInYear(new Date(2026, 0, 1))).toBeGreaterThan(50);
  });
});

describe('computeKnskForecast', () => {
  it('returns null without planYear', () => {
    expect(computeKnskForecast({ fact: 100 })).toBeNull();
  });

  it('ontrack when pace covers the remainder', () => {
    const f = computeKnskForecast({
      fact: 100000,
      planYear: 220000,
      avgWeekly: 5000,
      weeksLeft: 26,
    });
    expect(f.status).toBe('ontrack');
    expect(f.projectedTotal).toBe(100000 + 5000 * 26);
    expect(f.neededWeekly).toBeCloseTo(120000 / 26, 5);
    expect(f.etaWeeks).toBe(24);
  });

  it('behind when pace is far below needed', () => {
    const f = computeKnskForecast({
      fact: 50000,
      planYear: 220000,
      avgWeekly: 1000,
      weeksLeft: 20,
    });
    expect(f.status).toBe('behind');
    expect(f.projectedPercent).toBeCloseTo(((50000 + 20000) / 220000) * 100, 5);
  });

  it('risk in the 85%..100% needed-pace window', () => {
    const f = computeKnskForecast({
      fact: 0,
      planYear: 100000,
      avgWeekly: 900, // нужно 1000/нед
      weeksLeft: 100,
    });
    expect(f.status).toBe('risk');
  });

  it('done when plan already reached', () => {
    const f = computeKnskForecast({ fact: 220000, planYear: 220000, weeksLeft: 10 });
    expect(f.status).toBe('done');
    expect(f.remaining).toBe(0);
  });

  it('unknown without weekly data', () => {
    const f = computeKnskForecast({ fact: 100, planYear: 220000, weeks: [], weeksLeft: 10 });
    expect(f.status).toBe('unknown');
    expect(f.avgWeekly).toBeNull();
    expect(f.projectedTotal).toBeNull();
  });
});

describe('computeCoverageForecast', () => {
  it('computes gap to the 70% target', () => {
    const c = computeCoverageForecast({ colon: 600, hasDev: 1000 });
    expect(c.targetPercent).toBe(DEFAULT_COVERAGE_TARGET);
    expect(c.currentPercent).toBeCloseTo(60, 5);
    expect(c.needColon).toBe(100);
    expect(c.reached).toBe(false);
    expect(c.status).toBe('risk'); // до цели ≤ 10 п.п.
  });

  it('behind when the gap exceeds 10 pp', () => {
    const c = computeCoverageForecast({ colon: 300, hasDev: 1000 });
    expect(c.status).toBe('behind');
    expect(c.needColon).toBe(400);
  });

  it('done when the target is reached', () => {
    const c = computeCoverageForecast({ colon: 800, hasDev: 1000 });
    expect(c.reached).toBe(true);
    expect(c.status).toBe('done');
    expect(c.needColon).toBe(0);
  });

  it('unknown without positive KnSK patients', () => {
    const c = computeCoverageForecast({ colon: 0, hasDev: 0 });
    expect(c.status).toBe('unknown');
    expect(c.currentPercent).toBe(0);
  });

  it('honors a custom target', () => {
    const c = computeCoverageForecast({ colon: 500, hasDev: 1000, targetPercent: 50 });
    expect(c.reached).toBe(true);
  });
});
