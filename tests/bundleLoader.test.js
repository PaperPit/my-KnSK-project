import { describe, it, expect } from 'vitest';
import {
  initBundleLoader,
  setMoProfileContext,
  registerChartDataLabels,
} from '../src/core/bundleLoader.js';

describe('bundleLoader', () => {
  it('initBundleLoader accepts adapter', () => {
    initBundleLoader({ originalRun: null });
    expect(true).toBe(true);
  });

  it('registerChartDataLabels is safe without Chart', () => {
    expect(() => registerChartDataLabels()).not.toThrow();
  });
});
