import { describe, it, expect } from 'vitest';
import { ageBand, ageLabel, fullDaysBetween } from '../age';

describe('fullDaysBetween', () => {
  it('counts whole days', () => {
    expect(fullDaysBetween('2026-09-01', '2026-09-07')).toBe(6);
    expect(fullDaysBetween('2026-09-07', '2026-09-07')).toBe(0);
  });

  it('ignores any time component rather than producing a fractional day', () => {
    expect(fullDaysBetween('2026-09-01T23:59:00Z', '2026-09-07T00:01:00Z')).toBe(6);
  });

  it('is unaffected by the British Summer Time boundary', () => {
    // Clocks go back on 2026-10-25. Parsed as UTC midnight, so the run is still 2 days.
    expect(fullDaysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('throws rather than silently returning NaN', () => {
    expect(() => fullDaysBetween('not-a-date', '2026-09-07')).toThrow();
  });
});

describe('ageBand', () => {
  it('treats a few days as normal', () => {
    expect(ageBand(0)).toBe('fresh');
    expect(ageBand(3)).toBe('fresh');
    expect(ageBand(6)).toBe('fresh');
  });

  it('escalates through a nudge and going cold', () => {
    expect(ageBand(7)).toBe('ageing');
    expect(ageBand(20)).toBe('ageing');
    expect(ageBand(21)).toBe('stale');
    expect(ageBand(41)).toBe('stale');
  });

  it('calls six weeks a dead lead', () => {
    expect(ageBand(42)).toBe('dead');
    expect(ageBand(200)).toBe('dead');
  });

  it('does not render three days and six weeks in the same band', () => {
    expect(ageBand(3)).not.toBe(ageBand(42));
  });
});

describe('ageLabel', () => {
  it('reads naturally at every scale', () => {
    expect(ageLabel(0)).toBe('Today');
    expect(ageLabel(1)).toBe('1 day');
    expect(ageLabel(9)).toBe('9 days');
    expect(ageLabel(21)).toBe('3 weeks');
    expect(ageLabel(90)).toBe('3 months');
  });
});
