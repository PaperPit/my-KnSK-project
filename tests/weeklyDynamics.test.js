import { describe, it, expect } from 'vitest';
import { getCalendarWeekMonSun, getDynamicsWeekMonSun } from '../src/lib/dateUtils.js';
import {
  sumDynamicsFromMosData,
  buildWeeksDataFromReports,
  mergeReportDynamicsWeek,
  buildWeekPointFromReport,
  DEFAULT_WEEKLY_DYNAMICS_LIMIT,
} from '../src/lib/weeklyDynamics.js';

const mosSample = [
  { name: 'МО А', plan: 1000, fact: 500, growth: 120, colon: 10, hasDev: 20, zno: 1, noDev: 5 },
  { name: 'МО Б', plan: 1000, fact: 400, growth: 80, colon: 8, hasDev: 15, zno: 0, noDev: 4 },
];

describe('getDynamicsWeekMonSun', () => {
  it('labels previous Mon–Sun relative to report date', () => {
    const reportWeek = getCalendarWeekMonSun('11.03.2026');
    const dynamicsWeek = getDynamicsWeekMonSun('11.03.2026');
    expect(reportWeek.startIso).toBe('2026-03-09');
    expect(dynamicsWeek.startIso).toBe('2026-03-02');
    expect(dynamicsWeek.endIso).toBe('2026-03-08');
    expect(dynamicsWeek.period).toBe('02.03-08.03');
  });
});

describe('sumDynamicsFromMosData', () => {
  it('sums growth column across MO', () => {
    expect(sumDynamicsFromMosData(mosSample)).toBe(200);
  });
});

describe('buildWeekPointFromReport', () => {
  it('builds week point with dynamics sum for previous week', () => {
    const point = buildWeekPointFromReport(
      { timestamp: '11.03.2026', mosData: mosSample },
      '11.03.2026'
    );
    expect(point.value).toBe(200);
    expect(point.start).toBe('2026-03-02');
    expect(point.end).toBe('2026-03-08');
  });
});

describe('buildWeeksDataFromReports', () => {
  it('returns one point per report up to limit', () => {
    const reports = [];
    for (let i = 0; i < 7; i++) {
      reports.push({
        report: {
          timestamp: `${10 + i}.03.2026`,
          mosData: [{ name: 'МО', plan: 1, fact: 1, growth: i + 1 }],
        },
      });
    }
    const weeks = buildWeeksDataFromReports(reports);
    expect(weeks).toHaveLength(DEFAULT_WEEKLY_DYNAMICS_LIMIT);
  });

  it('sorts weeks chronologically', () => {
    const weeks = buildWeeksDataFromReports([
      {
        report: {
          timestamp: '18.03.2026',
          mosData: [{ name: 'МО', plan: 1, fact: 1, growth: 10 }],
        },
      },
      {
        report: {
          timestamp: '11.03.2026',
          mosData: [{ name: 'МО', plan: 1, fact: 1, growth: 20 }],
        },
      },
    ]);
    expect(weeks).toHaveLength(2);
    expect(weeks[0].start).toBe('2026-03-02');
    expect(weeks[1].start).toBe('2026-03-09');
  });
});

describe('mergeReportDynamicsWeek', () => {
  it('uses report anchor for dynamics week label', () => {
    const merged = mergeReportDynamicsWeek([], mosSample, '11.03.2026');
    expect(merged).toHaveLength(1);
    expect(merged[0].start).toBe('2026-03-02');
    expect(merged[0].value).toBe(200);
  });
});
