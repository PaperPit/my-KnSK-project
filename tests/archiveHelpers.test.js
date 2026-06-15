import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  parseArchiveReportRow_,
  buildArchiveIndex_,
  getPreviousArchiveIdFromList_,
  formatArchiveDate_,
  buildMoHistoryFromRows_,
  normalizeMoKey_,
} from '../src/server/archive.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/archive-report.json'), 'utf8')
);

describe('formatArchiveDate_', () => {
  it('formats Date as dd.mm.yyyy', () => {
    const d = new Date(2026, 0, 13); // 13.01.2026 (месяц 0-индексный)
    expect(formatArchiveDate_(d)).toBe('13.01.2026');
  });

  it('pads day and month', () => {
    expect(formatArchiveDate_(new Date(2026, 8, 5))).toBe('05.09.2026');
  });

  it('strips time part from ISO-like string', () => {
    expect(formatArchiveDate_('2026-01-13T10:00:00')).toBe('2026-01-13');
  });

  it('returns plain string untouched', () => {
    expect(formatArchiveDate_('17.01.2026')).toBe('17.01.2026');
  });

  it('stringifies numbers', () => {
    expect(formatArchiveDate_(42)).toBe('42');
  });
});

describe('parseArchiveReportRow_', () => {
  it('parses JSON row and stamps timestamp', () => {
    const row = [101, '2026-01-13T00:00:00', JSON.stringify(fixture), 'Период'];
    const report = parseArchiveReportRow_(row);
    expect(report.mosData).toHaveLength(2);
    expect(report.mosData[0].name).toBe('ГКБ №1');
    expect(report.timestamp).toBe('2026-01-13');
  });

  it('aliases legacy MOSData to mosData', () => {
    const payload = { MOSData: [{ name: 'Legacy', plan: 10, fact: 5 }] };
    const row = [102, '2026-01-14', JSON.stringify(payload), 'p'];
    const report = parseArchiveReportRow_(row);
    expect(report.mosData).toHaveLength(1);
    expect(report.mosData[0].name).toBe('Legacy');
  });

  it('parses stringified mosData JSON inside payload', () => {
    const inner = [{ name: 'Inner', plan: 1, fact: 1 }];
    const payload = { mosData: JSON.stringify(inner) };
    const row = [103, '2026-01-15', JSON.stringify(payload), 'p'];
    const report = parseArchiveReportRow_(row);
    expect(report.mosData).toEqual(inner);
  });

  it('falls back to empty array for broken mosData JSON', () => {
    const payload = { mosData: '{not json' };
    const row = [104, '2026-01-16', JSON.stringify(payload), 'p'];
    const report = parseArchiveReportRow_(row);
    expect(report.mosData).toEqual([]);
  });

  it('coerces non-array mosData to empty array', () => {
    const payload = { mosData: { weird: true } };
    const row = [105, '2026-01-17', JSON.stringify(payload), 'p'];
    const report = parseArchiveReportRow_(row);
    expect(report.mosData).toEqual([]);
  });

  it('throws on completely broken row JSON', () => {
    const row = [106, '2026-01-18', '{not json at all', 'p'];
    expect(() => parseArchiveReportRow_(row)).toThrow(/Повреждённые данные/);
  });
});

describe('buildArchiveIndex_', () => {
  // Минимальный stub листа: getLastRow() + getRange().getValues()
  function fakeSheet(rows) {
    return {
      getLastRow() {
        return rows.length + 1; // +1 для строки-заголовка
      },
      getRange() {
        return {
          getValues() {
            // buildArchiveIndex_ запрашивает со 2-й строки, отдаём данные без заголовка
            return rows;
          },
        };
      },
    };
  }

  it('returns empty index for sheet with no data rows', () => {
    const sheet = fakeSheet([]);
    const index = buildArchiveIndex_(sheet);
    expect(index.list).toEqual([]);
    expect(index.idToRow).toEqual({});
  });

  it('builds sorted-by-id-desc list and idToRow map', () => {
    const sheet = fakeSheet([
      [5, '2026-01-05'],
      [10, '2026-01-10'],
      [7, '2026-01-07'],
    ]);
    const index = buildArchiveIndex_(sheet);
    expect(index.list.map((x) => x.id)).toEqual([10, 7, 5]);
    expect(index.list.map((x) => x.dateStr)).toEqual([
      '2026-01-10',
      '2026-01-07',
      '2026-01-05',
    ]);
    // idToRow: номер строки = индекс в values + 2.
    // Порядок в исходных данных: [5(i=0), 10(i=1), 7(i=2)] → строки 2,3,4.
    expect(index.idToRow[5]).toBe(2);
    expect(index.idToRow[10]).toBe(3);
    expect(index.idToRow[7]).toBe(4);
  });

  it('skips rows with invalid id', () => {
    const sheet = fakeSheet([
      [0, '2026-01-01'],
      [NaN, '2026-01-02'],
      [15, '2026-01-15'],
    ]);
    const index = buildArchiveIndex_(sheet);
    expect(index.list.map((x) => x.id)).toEqual([15]);
    // id=15 в исходных данных на i=2 → строка 4.
    expect(index.idToRow[15]).toBe(4);
  });
});

describe('getPreviousArchiveIdFromList_', () => {
  // Список отсортирован по убыванию id (как строит buildArchiveIndex_)
  const list = [
    { id: 30, dateStr: '30' },
    { id: 20, dateStr: '20' },
    { id: 10, dateStr: '10' },
  ];

  it('returns next (older) id for a known id', () => {
    expect(getPreviousArchiveIdFromList_(list, 30)).toBe(20);
    expect(getPreviousArchiveIdFromList_(list, 20)).toBe(10);
  });

  it('returns null when id is the oldest (last)', () => {
    expect(getPreviousArchiveIdFromList_(list, 10)).toBeNull();
  });

  it('returns null when id is not in list', () => {
    expect(getPreviousArchiveIdFromList_(list, 999)).toBeNull();
  });

  it('returns null for empty list', () => {
    expect(getPreviousArchiveIdFromList_([], 10)).toBeNull();
  });

  it('coerces currentId to Number', () => {
    expect(getPreviousArchiveIdFromList_(list, '30')).toBe(20);
  });
});

describe('buildMoHistoryFromRows_', () => {
  it('extracts history points for MO across reports', () => {
    const row1 = [1, '2026-01-10', JSON.stringify(fixture), '10.01 - 17.01'];
    const row2Payload = {
      mosData: [
        {
          name: 'ГКБ №1',
          plan: 5000,
          fact: 3500,
          percent: 70,
          growth: 130,
          colon: 460,
          zno: 10,
          noDev: 750,
          hasDev: 1100,
        },
      ],
      period: '17.01 - 24.01',
    };
    const row2 = [2, '2026-01-17', JSON.stringify(row2Payload), '17.01 - 24.01'];
    const result = buildMoHistoryFromRows_([row1, row2], 'ГКБ №1');

    expect(result.meta.totalReports).toBe(2);
    expect(result.meta.matchedReports).toBe(2);
    expect(result.points).toHaveLength(2);
    expect(result.points[0].reportId).toBe(1);
    expect(result.points[1].fact).toBe(3500);
    expect(result.points[0].coverage).toBeCloseTo((450 / 1200) * 100, 1);
  });

  it('returns empty for unknown MO', () => {
    const row = [1, '2026-01-10', JSON.stringify(fixture), 'p'];
    const result = buildMoHistoryFromRows_([row], 'Неизвестная МО');
    expect(result.points).toEqual([]);
  });

  it('normalizeMoKey_ matches case-insensitively', () => {
    expect(normalizeMoKey_('  ГКБ №1 ')).toBe('гкб №1');
  });
});
