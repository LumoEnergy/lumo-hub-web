import { describe, it, expect } from 'vitest';
import {
  EARNINGS,
  QUALIFYING_DAYS,
  REWARD_GBP,
  daysRemainingLabel,
  deriveEarningsState,
} from '../earnings';

const TODAY = '2026-09-07';

const at = (daysAgo: number): string => {
  const d = new Date(Date.parse(`${TODAY}T00:00:00Z`) - daysAgo * 86_400_000);
  return d.toISOString().slice(0, 10);
};

describe('the 30-day consecutive clock', () => {
  it('starts at not_eligible when control has never been active', () => {
    const q = deriveEarningsState(
      { everActive: false, controlActiveSince: null, qualifiedAt: null, paidAt: null },
      TODAY,
    );
    expect(q.state).toBe('not_eligible');
    expect(q.daysServed).toBe(0);
    expect(q.daysRemaining).toBe(QUALIFYING_DAYS);
  });

  it('counts days served from the start of the current unbroken run', () => {
    const q = deriveEarningsState(
      { everActive: true, controlActiveSince: at(18), qualifiedAt: null, paidAt: null },
      TODAY,
    );
    expect(q.state).toBe('qualifying');
    expect(q.daysServed).toBe(18);
    expect(q.daysRemaining).toBe(12);
  });

  it('is still qualifying on day 29', () => {
    const q = deriveEarningsState(
      { everActive: true, controlActiveSince: at(29), qualifiedAt: null, paidAt: null },
      TODAY,
    );
    expect(q.state).toBe('qualifying');
    expect(q.daysRemaining).toBe(1);
  });

  it('confirms on day 30 exactly', () => {
    const q = deriveEarningsState(
      { everActive: true, controlActiveSince: at(30), qualifiedAt: null, paidAt: null },
      TODAY,
    );
    expect(q.state).toBe('confirmed');
    expect(q.daysRemaining).toBe(0);
  });

  it('lapses when control drops before the 30 days are up, and resets to zero', () => {
    const q = deriveEarningsState(
      { everActive: true, controlActiveSince: null, qualifiedAt: null, paidAt: null },
      TODAY,
    );
    expect(q.state).toBe('lapsed');
    expect(q.daysServed).toBe(0);
    expect(q.daysRemaining).toBe(QUALIFYING_DAYS);
  });

  it('restarts from zero after a lapse rather than resuming a part-served clock', () => {
    // 25 days served, dropped, back on for 3. Consecutive means 3, not 28.
    const q = deriveEarningsState(
      { everActive: true, controlActiveSince: at(3), qualifiedAt: null, paidAt: null },
      TODAY,
    );
    expect(q.daysServed).toBe(3);
    expect(q.daysRemaining).toBe(27);
  });
});

describe('clawback: confirmed is final', () => {
  it('keeps the reward confirmed when control drops after qualification', () => {
    const q = deriveEarningsState(
      { everActive: true, controlActiveSince: null, qualifiedAt: at(90), paidAt: null },
      TODAY,
    );
    expect(q.state).toBe('confirmed');
    expect(q.confirmedButControlDropped).toBe(true);
  });

  it('keeps a paid reward paid when control drops afterwards', () => {
    const q = deriveEarningsState(
      { everActive: true, controlActiveSince: null, qualifiedAt: at(120), paidAt: at(90) },
      TODAY,
    );
    expect(q.state).toBe('paid');
    expect(q.confirmedButControlDropped).toBe(true);
  });

  it('does not flag a drop when control is still running', () => {
    const q = deriveEarningsState(
      { everActive: true, controlActiveSince: at(60), qualifiedAt: at(30), paidAt: null },
      TODAY,
    );
    expect(q.state).toBe('confirmed');
    expect(q.confirmedButControlDropped).toBe(false);
  });

  it('has no transition from confirmed to lapsed, which is the whole policy', () => {
    expect(EARNINGS.transitions.confirmed).not.toContain('lapsed');
    expect(EARNINGS.transitions.paid).toEqual([]);
  });

  it('only allows a lapse out of qualifying', () => {
    const canLapse = EARNINGS.order.filter((id) => EARNINGS.transitions[id].includes('lapsed'));
    expect(canLapse).toEqual(['qualifying']);
  });
});

describe('commercial constants', () => {
  it('holds the reward as a single flat amount, ready to be banded if that is decided', () => {
    expect(REWARD_GBP).toBe(50);
    expect(QUALIFYING_DAYS).toBe(30);
  });
});

describe('daysRemainingLabel', () => {
  it('singularises the last day', () => {
    expect(daysRemainingLabel(1)).toBe('1 day to go');
    expect(daysRemainingLabel(12)).toBe('12 days to go');
    expect(daysRemainingLabel(0)).toBe('Confirmed');
  });
});
