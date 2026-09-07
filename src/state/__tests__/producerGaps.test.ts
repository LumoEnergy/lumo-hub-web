import { describe, it, expect } from 'vitest';
import { PRODUCER_GAPS, producerGapsFor } from '../producerGaps';
import { ACTIVATION_STATE_IDS } from '../activation';
import { INVITE_STATE_IDS } from '../invite';
import { MATCH_STATE_IDS } from '../match';
import { EARNINGS_STATE_IDS } from '../earnings';

const ALL_STATE_IDS: readonly string[] = [
  ...INVITE_STATE_IDS,
  ...ACTIVATION_STATE_IDS,
  ...MATCH_STATE_IDS,
  ...EARNINGS_STATE_IDS,
];

describe('the producer-gap register', () => {
  it('names all three gaps, not the two that are easy to spot', () => {
    expect(PRODUCER_GAPS.map((g) => g.id)).toEqual([
      'invite_lifecycle',
      'account_matching',
      'installer_identity',
    ]);
  });

  it('records the missing installer entity, which gates the real build', () => {
    const gap = PRODUCER_GAPS.find((g) => g.id === 'installer_identity');
    expect(gap?.blocksRealBuild).toBe(true);
    expect(gap?.whyMissing).toContain('partnerTag');
  });

  it('only refers to states that exist in the model', () => {
    for (const gap of PRODUCER_GAPS) {
      for (const id of gap.statesAffected) {
        expect(ALL_STATE_IDS, `${gap.id} refers to unknown state ${id}`).toContain(id);
      }
    }
  });

  it('flags the whole invite track, because none of it has a producer', () => {
    for (const id of INVITE_STATE_IDS) {
      expect(producerGapsFor(id).length, `${id} should be flagged`).toBeGreaterThan(0);
    }
  });

  it('flags every match state', () => {
    for (const id of MATCH_STATE_IDS) {
      expect(producerGapsFor(id).length, `${id} should be flagged`).toBeGreaterThan(0);
    }
  });

  it('gives every gap evidence and a statement of what must be built', () => {
    for (const gap of PRODUCER_GAPS) {
      expect(gap.evidence.length, `${gap.id} needs evidence`).toBeGreaterThan(40);
      expect(
        gap.whatTheRealBuildMustCreate.length,
        `${gap.id} needs a build requirement`,
      ).toBeGreaterThan(40);
    }
  });
});
