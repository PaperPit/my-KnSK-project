import { describe, it, expect } from 'vitest';
import { sanitizeSignalSettings_ } from '../src/server/webapp.js';

describe('sanitizeSignalSettings_', () => {
  it('keeps valid values and rounds them', () => {
    const out = sanitizeSignalSettings_({
      planYear: 250000.6,
      planWeekly: 5000,
      planThreshold: 75,
      coverageLowThreshold: 45,
      coverageTarget: 70,
    });
    expect(out).toEqual({
      planYear: 250001,
      planWeekly: 5000,
      planThreshold: 75,
      coverageLowThreshold: 45,
      coverageTarget: 70,
    });
  });

  it('drops unknown keys and out-of-range values', () => {
    const out = sanitizeSignalSettings_({
      planYear: -5,
      planThreshold: 150,
      coverageTarget: '68',
      evil: 'alert(1)',
    });
    expect(out).toEqual({ coverageTarget: 68 });
  });

  it('returns empty object for junk input', () => {
    expect(sanitizeSignalSettings_(null)).toEqual({});
    expect(sanitizeSignalSettings_('str')).toEqual({});
    expect(sanitizeSignalSettings_({ planYear: 'NaN' })).toEqual({});
  });
});
