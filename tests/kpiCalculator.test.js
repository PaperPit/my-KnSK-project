import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCSV } from '../src/lib/csvParser.js';
import {
  buildMosFromData,
  computeTotals,
  computeTotalsFromMosData,
  computeYearPercent,
  computePeriodDeltas,
} from '../src/lib/kpiCalculator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleCsv = fs.readFileSync(path.join(__dirname, 'fixtures/sample.csv'), 'utf8');
const archiveFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/archive-report.json'), 'utf8')
);

describe('buildMosFromData', () => {
  it('builds MO rows from raw CSV rows', () => {
    const csvRows = parseCSV(sampleCsv);
    const mos = buildMosFromData(csvRows);
    expect(mos).toHaveLength(3);
    expect(mos[0].name).toBe('ГКБ №1');
    expect(mos[0].plan).toBe(5000);
    expect(mos[0].fact).toBe(3200);
    expect(mos[0].growth).toBe(120);
    expect(mos[0].percent).toBeCloseTo(64, 1);
  });

  it('builds MO rows from processed archive shape', () => {
    const mos = buildMosFromData(archiveFixture.mosData);
    expect(mos[0].fact).toBe(3200);
    expect(mos[1].colon).toBe(380);
  });
});

describe('computeTotals', () => {
  it('aggregates MO metrics', () => {
    const mos = buildMosFromData(archiveFixture.mosData);
    const totals = computeTotals(mos);
    expect(totals.plan).toBe(9200);
    expect(totals.fact).toBe(6000);
    expect(totals.growth).toBe(215);
    expect(totals.colon).toBe(830);
    expect(totals.zno).toBe(20);
    expect(totals.percent).toBeCloseTo((6000 / 9200) * 100, 2);
    expect(totals.colonPercent).toBeCloseTo((830 / 2180) * 100, 2);
  });
});

describe('computeTotalsFromMosData', () => {
  it('chains build and aggregate', () => {
    const totals = computeTotalsFromMosData(archiveFixture.mosData);
    expect(totals.fact).toBe(6000);
  });
});

describe('computeYearPercent', () => {
  it('computes percent of annual plan', () => {
    const totals = computeTotalsFromMosData(archiveFixture.mosData);
    expect(computeYearPercent(totals, 220000)).toBeCloseTo((6000 / 220000) * 100, 4);
    expect(computeYearPercent(totals, 0)).toBe(0);
  });
});

describe('computePeriodDeltas', () => {
  it('returns null without previous totals', () => {
    const totals = computeTotalsFromMosData(archiveFixture.mosData);
    expect(computePeriodDeltas(totals, null, 220000)).toBeNull();
  });

  it('computes deltas between periods including yearPercent', () => {
    const current = computeTotalsFromMosData(archiveFixture.mosData);
    const previous = { ...current, fact: 5500, growth: 180, colon: 700, zno: 15, percent: 59 };
    const deltas = computePeriodDeltas(current, previous, 220000);
    expect(deltas.fact).toBe(500);
    expect(deltas.growth).toBe(35);
    expect(deltas.colon).toBe(130);
    expect(deltas.zno).toBe(5);
    // yearPercent = (6000/220000*100) - (5500/220000*100)
    expect(deltas.yearPercent).toBeCloseTo(((6000 - 5500) / 220000) * 100, 4);
  });

  it('yearPercent is 0 when planYear is falsy', () => {
    const current = computeTotalsFromMosData(archiveFixture.mosData);
    const previous = { ...current, fact: 5500 };
    const deltas = computePeriodDeltas(current, previous, 0);
    expect(deltas.yearPercent).toBe(0);
  });
});
