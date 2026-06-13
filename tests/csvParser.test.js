import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCSV } from '../src/lib/csvParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleCsv = fs.readFileSync(path.join(__dirname, 'fixtures/sample.csv'), 'utf8');

describe('parseCSV', () => {
  it('returns empty array for too few lines', () => {
    expect(parseCSV('header only')).toEqual([]);
    expect(parseCSV('')).toEqual([]);
  });

  it('parses sample fixture with Russian headers', () => {
    const rows = parseCSV(sampleCsv);
    expect(rows).toHaveLength(3);
    expect(rows[0]['Наименование МО']).toBe('ГКБ №1');
    expect(rows[0]['План на год']).toBe('5000');
    expect(rows[0]['Общий итог']).toBe('3200 (+64%)');
    expect(rows[1]['Наименование МО']).toBe('ПКБ им. Розанова В.Н.');
  });

  it('handles quoted fields with commas when row has enough columns', () => {
    const text =
      'c1,c2,c3,c4,c5\n"MO, branch",100,200,300,400';
    const rows = parseCSV(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].c1).toBe('MO, branch');
    expect(rows[0].c2).toBe('100');
    expect(rows[0].c5).toBe('400');
  });
});
