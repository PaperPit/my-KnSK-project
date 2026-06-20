import { describe, it, expect } from 'vitest';
import { runChartDiagnostics } from '../src/core/chartDiagnostics.js';

describe('chartDiagnostics', () => {
  it('runChartDiagnostics returns structured report without GAS', async () => {
    const result = await runChartDiagnostics(null);
    expect(result.text).toContain('KnSK Chart Diagnostics');
    expect(result.tests.length).toBeGreaterThan(5);
    expect(typeof result.passed).toBe('number');
    expect(typeof result.failed).toBe('number');
  });
});
