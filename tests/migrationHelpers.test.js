import { describe, it, expect } from 'vitest';
import {
  normalizeMoName_,
  extractFactFromMo_,
  lookupNewPlan2026_,
  updateMoPlanFields_,
  updateReportPlans2026_,
} from '../src/server/migrations.js';

describe('normalizeMoName_', () => {
  it('lowercases and strips non-alphanumerics', () => {
    expect(normalizeMoName_('ГКБ №1')).toBe('гкб1');
    expect(normalizeMoName_('ПКБ им. Розанова В.Н.')).toBe('пкбимрозановавн');
  });

  it('replaces ё with е', () => {
    expect(normalizeMoName_('Щёлковская Б')).toBe('щелковскаяб');
  });

  it('handles null/empty safely', () => {
    expect(normalizeMoName_(null)).toBe('');
    expect(normalizeMoName_('')).toBe('');
  });

  it('keeps digits and latin letters', () => {
    expect(normalizeMoName_('MO-42 test')).toBe('mo42test');
  });
});

describe('extractFactFromMo_', () => {
  it('reads item.fact', () => {
    expect(extractFactFromMo_({ fact: 3200 })).toBe(3200);
  });

  it('falls back to legacy Общий итог key', () => {
    expect(extractFactFromMo_({ 'Общий итог': 1500 })).toBe(1500);
  });

  it('prefers fact over Общий итог when both present', () => {
    expect(extractFactFromMo_({ fact: 100, 'Общий итог': 200 })).toBe(100);
  });

  it('parses numeric strings with spaces', () => {
    expect(extractFactFromMo_({ fact: '3 200' })).toBe(3200);
  });

  it('returns 0 for empty/null values', () => {
    expect(extractFactFromMo_({ fact: '' })).toBe(0);
    expect(extractFactFromMo_({ fact: null })).toBe(0);
    expect(extractFactFromMo_({})).toBe(0);
  });

  it('returns 0 for non-numeric string', () => {
    expect(extractFactFromMo_({ fact: 'abc' })).toBe(0);
  });
});

describe('lookupNewPlan2026_', () => {
  const mapping = {
    byShortName: {
      'ГКБ №1': 5000,
      'ПКБ им. Розанова В.Н.': 7777,
    },
    byNormalizedShortName: {
      гкб1: 5000,
      пкимрозановавн: 7777,
      щелковскаяб: 9313,
    },
  };

  it('finds exact short name', () => {
    expect(lookupNewPlan2026_('ГКБ №1', mapping)).toBe(5000);
  });

  it('falls back to normalized lookup (ё/punctuation)', () => {
    expect(lookupNewPlan2026_('Щёлковская Б', mapping)).toBe(9313);
  });

  it('trims input before lookup', () => {
    expect(lookupNewPlan2026_('  ГКБ №1  ', mapping)).toBe(5000);
  });

  it('returns null for unknown name', () => {
    expect(lookupNewPlan2026_('Неизвестная Б', mapping)).toBeNull();
  });

  it('returns null for empty name', () => {
    expect(lookupNewPlan2026_('', mapping)).toBeNull();
    expect(lookupNewPlan2026_(null, mapping)).toBeNull();
  });
});

describe('updateMoPlanFields_', () => {
  it('updates plan and recomputes percent', () => {
    const item = { name: 'ГКБ №1', plan: 4000, fact: 2000, percent: 50 };
    const changed = updateMoPlanFields_(item, 5000);
    expect(changed).toBe(true);
    expect(item.plan).toBe(5000);
    expect(item.percent).toBeCloseTo(40, 5); // 2000/5000*100
  });

  it('updates legacy План на год and % keys', () => {
    const item = { 'План на год': '4000', 'Общий итог': 2000, '%': '50.0%' };
    const changed = updateMoPlanFields_(item, 5000);
    expect(changed).toBe(true);
    expect(item['План на год']).toBe('5000');
    expect(item['%']).toBe('40.0%');
  });

  it('returns false when plan unchanged', () => {
    const item = { plan: 5000, fact: 2000, percent: 40 };
    const changed = updateMoPlanFields_(item, 5000);
    expect(changed).toBe(false);
    expect(item.plan).toBe(5000); // не изменилось
  });

  it('handles zero new plan (percent → 0)', () => {
    const item = { plan: 5000, fact: 2000, percent: 40 };
    const changed = updateMoPlanFields_(item, 0);
    expect(changed).toBe(true);
    expect(item.plan).toBe(0);
    expect(item.percent).toBe(0);
  });
});

describe('updateReportPlans2026_', () => {
  const mapping = {
    byShortName: { 'ГКБ №1': 5000, 'ПКБ им. Розанова В.Н.': 7777 },
    byNormalizedShortName: { гкб1: 5000, пкимрозановавн: 7777 },
  };

  it('updates mosData items and counts changes', () => {
    const report = {
      mosData: [
        { name: 'ГКБ №1', plan: 4000, fact: 2000, percent: 50 },
        { name: 'ПКБ им. Розанова В.Н.', plan: 7000, fact: 3000, percent: 42.8 },
      ],
    };
    const result = updateReportPlans2026_(report, mapping);
    expect(result.changed).toBe(2);
    expect(result.notFound).toEqual([]);
    expect(result.details).toHaveLength(2);
    expect(report.mosData[0].plan).toBe(5000);
    expect(report.mosData[1].plan).toBe(7777);
  });

  it('collects notFound for unmatched MOs', () => {
    const report = {
      mosData: [
        { name: 'ГКБ №1', plan: 5000, fact: 2000, percent: 40 }, // план совпадает — no change
        { name: 'Неизвестная Б', plan: 1000, fact: 500, percent: 50 },
      ],
    };
    const result = updateReportPlans2026_(report, mapping);
    expect(result.changed).toBe(0);
    expect(result.notFound).toContain('Неизвестная Б');
  });

  it('handles legacy MOSData alias', () => {
    const report = {
      MOSData: [{ name: 'ГКБ №1', plan: 4000, fact: 2000, percent: 50 }],
    };
    const result = updateReportPlans2026_(report, mapping);
    expect(result.changed).toBe(1);
    expect(report.MOSData[0].plan).toBe(5000);
    // также заполняет mosData
    expect(report.mosData[0].plan).toBe(5000);
  });

  it('parses stringified mosData JSON', () => {
    const inner = [{ name: 'ГКБ №1', plan: 4000, fact: 2000, percent: 50 }];
    const report = { mosData: JSON.stringify(inner) };
    const result = updateReportPlans2026_(report, mapping);
    expect(result.changed).toBe(1);
    expect(Array.isArray(report.mosData)).toBe(true);
    expect(report.mosData[0].plan).toBe(5000);
  });

  it('returns zero changes for report with no MO data', () => {
    const result = updateReportPlans2026_({ period: 'x' }, mapping);
    expect(result.changed).toBe(0);
    expect(result.notFound).toEqual([]);
  });

  it('tries multiple candidate name keys', () => {
    const report = {
      mosData: [{ 'Краткое наименование': 'ГКБ №1', plan: 4000, fact: 2000, percent: 50 }],
    };
    const result = updateReportPlans2026_(report, mapping);
    expect(result.changed).toBe(1);
    expect(report.mosData[0].plan).toBe(5000);
  });
});
