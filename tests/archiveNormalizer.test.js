import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeArchiveReport } from '../src/lib/archiveNormalizer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/archive-report.json'), 'utf8')
);

describe('normalizeArchiveReport', () => {
  it('returns null for invalid input', () => {
    expect(normalizeArchiveReport(null)).toBeNull();
    expect(normalizeArchiveReport('bad')).toBeNull();
  });

  it('normalizes fixture mosData', () => {
    const result = normalizeArchiveReport(fixture);
    expect(result.mosData).toHaveLength(2);
    expect(result.mosData[0].name).toBe('ГКБ №1');
    expect(result.period).toBe('13.01.2026 - 17.01.2026');
  });

  it('maps MOSData alias to mosData', () => {
    const result = normalizeArchiveReport({
      MOSData: [{ name: 'Test MO', plan: 100, fact: 50 }],
      period: 'Q1',
    });
    expect(result.mosData).toHaveLength(1);
    expect(result.mosData[0].name).toBe('Test MO');
  });

  it('parses stringified mosData JSON', () => {
    const inner = [{ name: 'A', plan: 10, fact: 5 }];
    const result = normalizeArchiveReport({
      mosData: JSON.stringify(inner),
    });
    expect(result.mosData).toEqual(inner);
  });

  it('falls back to empty array for broken mosData JSON', () => {
    const result = normalizeArchiveReport({ mosData: '{not json' });
    expect(result.mosData).toEqual([]);
  });
});
