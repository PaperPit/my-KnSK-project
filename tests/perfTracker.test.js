import { describe, it, expect, beforeEach } from 'vitest';
import {
  perfMark,
  recordGasCall,
  getMarks,
  getGasCalls,
  resetPerfSession,
  estimatePayloadBytes,
  runPerformanceReport,
} from '../src/core/perfTracker.js';

describe('perfTracker', () => {
  beforeEach(() => {
    resetPerfSession();
  });

  it('records marks and gas calls', () => {
    perfMark('test-start');
    recordGasCall('getFoo', 120, 1024, true);
    expect(getMarks().length).toBe(1);
    expect(getGasCalls()[0].functionName).toBe('getFoo');
    expect(getGasCalls()[0].durationMs).toBe(120);
  });

  it('estimatePayloadBytes handles objects', () => {
    expect(estimatePayloadBytes({ a: 1 })).toBeGreaterThan(0);
    expect(estimatePayloadBytes('abc')).toBe(3);
  });

  it('runPerformanceReport returns text report', async () => {
    perfMark('kpi-rendered');
    recordGasCall('getArchiveBootstrap', 450, 50000, true);
    const report = await runPerformanceReport(null);
    expect(report.text).toContain('KnSK Performance Report');
    expect(report.text).toContain('kpi-rendered');
    expect(report.text).toContain('getArchiveBootstrap');
    expect(report.gasTotalMs).toBe(450);
  });
});
