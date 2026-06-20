import { describe, it, expect } from 'vitest';
import {
  normMoName,
  getMoPopulationGroup,
  filterMosByPopulationGroup,
  getMoPeerPool,
  getPopulationGroupDefinition,
  POPULATION_GROUP_IDS,
} from '../src/lib/moPopulationGroups.js';

describe('normMoName', () => {
  it('strips punctuation and spaces', () => {
    expect(normMoName('Щёлковская Б')).toBe('щелковскаяб');
    expect(normMoName('ПКБ им. Розанова В.Н.')).toBe('пкбимрозановавн');
  });
});

describe('getMoPopulationGroup', () => {
  it('returns group for known MO', () => {
    expect(getMoPopulationGroup('Щёлковская Б')).toBe('большая');
    expect(getMoPopulationGroup('Дубненская Б')).toBe('малая');
    expect(getMoPopulationGroup('Клинская Б')).toBe('средняя');
  });

  it('returns null for unknown MO', () => {
    expect(getMoPopulationGroup('Несуществующая Б')).toBeNull();
  });
});

describe('filterMosByPopulationGroup', () => {
  const mos = [
    { name: 'Щёлковская Б' },
    { name: 'Дубненская Б' },
    { name: 'Клинская Б' },
    { name: 'Неизвестная' },
  ];

  it('filters MO by group', () => {
    const large = filterMosByPopulationGroup(mos, 'большая');
    expect(large.map((m) => m.name)).toEqual(['Щёлковская Б']);
    const small = filterMosByPopulationGroup(mos, 'малая');
    expect(small.map((m) => m.name)).toEqual(['Дубненская Б']);
  });
});

describe('getMoPeerPool', () => {
  it('returns same-group peers from report', () => {
    const mos = [
      { name: 'Щёлковская Б', percent: 80 },
      { name: 'Балашихинская Б', percent: 70 },
      { name: 'Дубненская Б', percent: 60 },
    ];
    const peers = getMoPeerPool('Щёлковская Б', mos);
    expect(peers.map((m) => m.name)).toEqual(['Щёлковская Б', 'Балашихинская Б']);
  });
});

describe('population group metadata', () => {
  it('has three groups with labels', () => {
    expect(POPULATION_GROUP_IDS).toHaveLength(3);
    expect(getPopulationGroupDefinition('средняя')).toMatchObject({
      label: 'Средняя',
      populationRange: 'от 100 тыс. до 200 тыс.',
    });
  });
});
