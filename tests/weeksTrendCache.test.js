import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchWeeksTrend,
  getWeeksTrendCache,
  setWeeksTrendCache,
  invalidateWeeksTrendCache,
} from '../src/lib/weeksTrendCache.js';

describe('weeksTrendCache', () => {
  beforeEach(() => {
    invalidateWeeksTrendCache();
  });

  it('returns cached weeks without second request', async () => {
    const adapter = {
      originalRun: true,
      call: vi.fn().mockResolvedValue([{ start: '2026-03-02', end: '2026-03-08', value: 100 }]),
    };
    const first = await fetchWeeksTrend(adapter, 5);
    const second = await fetchWeeksTrend(adapter, 5);
    expect(first).toEqual(second);
    expect(adapter.call).toHaveBeenCalledTimes(1);
  });

  it('setWeeksTrendCache seeds client cache', () => {
    setWeeksTrendCache([{ start: '2026-03-02', end: '2026-03-08', value: 50 }]);
    expect(getWeeksTrendCache()).toHaveLength(1);
  });

  it('invalidateWeeksTrendCache clears state', async () => {
    setWeeksTrendCache([{ start: '2026-03-02', end: '2026-03-08', value: 50 }]);
    invalidateWeeksTrendCache();
    expect(getWeeksTrendCache()).toBeNull();
  });
});
