import { describe, it, expect } from 'vitest';
import { truncateName } from '../src/lib/moUtils.js';

describe('truncateName', () => {
  it('returns short name unchanged', () => {
    expect(truncateName('ГКБ №1', 10)).toBe('ГКБ №1');
  });

  it('truncates long name with ellipsis', () => {
    expect(truncateName('Сергиево-Посадская Б', 10)).toBe('Сергиево-…');
  });

  it('handles null/undefined safely', () => {
    expect(truncateName(null, 5)).toBe('');
    expect(truncateName(undefined, 5)).toBe('');
  });

  it('respects max boundary exactly', () => {
    // 5 символов → оставляем как есть; 6 символов → обрезаем
    expect(truncateName('12345', 5)).toBe('12345');
    expect(truncateName('123456', 5)).toBe('1234…');
  });
});
