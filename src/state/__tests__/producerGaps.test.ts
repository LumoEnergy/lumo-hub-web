import { describe, it, expect } from 'vitest';
import { PRODUCER_GAPS, producerGapsFor } from '../producerGaps';
import { ACTIVATION_STATE_IDS } from '../activation';
import { CONTACT_STATE_IDS } from '../contact';
import { MATCH_STATE_IDS } from '../match';
import { EARNINGS_STATE_IDS } from '../earnings';

const ALL_STATE_IDS: readonly string[] = [
  ...CONTACT_STATE_IDS,
  ...ACTIVATION_STATE_IDS,
  ...MATCH_STATE_IDS,
  ...EARNINGS_STATE_IDS,
];

describe('the producer-gap register', () => {
  it('names every gap, not just the ones that are easy to spot', () => {
    expect(PRODUCER_GAPS.map((g) => g.id)).toEqual([
      'campaign_lifecycle',
      'list_import',
      'account_matching',
      'installer_company_entity',
      'contact_permission',
      'sender_identity',
      'installer_site_visibility',
    ]);
  });

  it('records the missing company entity, which gates the real build', () => {
    const gap = PRODUCER_GAPS.find((g) => g.id === 'installer_company_entity');
    expect(gap?.blocksRealBuild).toBe(true);
    expect(gap?.whyMissing).toContain('partnerTag');
    // The money is owed to the firm; per-person data is an audit column, not an
    // identity to pay. If this wording ever flips back, the point has been lost.
    expect(gap?.whatTheRealBuildMustCreate).toContain('added-by');
  });

  it('treats permission as blocking, because it is the lawful basis for sending', () => {
    const gap = PRODUCER_GAPS.find((g) => g.id === 'contact_permission');
    expect(gap?.blocksRealBuild).toBe(true);
  });

  it('separates campaign mail from the app’s transactional mail', () => {
    // One shared sending domain means a bad list can take down password resets and
    // control alerts. This is the cheapest operational rule in the register.
    const gap = PRODUCER_GAPS.find((g) => g.id === 'sender_identity');
    expect(gap?.whatTheRealBuildMustCreate).toMatch(/separate/i);
  });

  it('only refers to states that exist in the model', () => {
    for (const gap of PRODUCER_GAPS) {
      for (const id of gap.statesAffected) {
        expect(ALL_STATE_IDS, `${gap.id} refers to unknown state ${id}`).toContain(id);
      }
    }
  });

  it('flags every contact state that depends on a producer we do not have', () => {
    // `imported` and the held states come from the import gap; everything from the
    // send onwards comes from the campaign gap. Between them that is the whole
    // track, which is the honest position: none of it exists today.
    for (const id of CONTACT_STATE_IDS) {
      if (id === 'signed_up') continue; // covered by the matching gap
      expect(producerGapsFor(id).length, `${id} should be flagged`).toBeGreaterThan(0);
    }
    expect(producerGapsFor('signed_up').length).toBeGreaterThan(0);
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
