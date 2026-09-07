/**
 * Blocker age.
 *
 * Every blocker carries its age, because three days is normal and six weeks is a
 * dead lead, and a list that presents them identically teaches installers to ignore
 * it. The bands exist so the UI cannot render them the same by accident.
 */

const MS_PER_DAY = 86_400_000;

/**
 * Whole days between two ISO dates, floored. Both are parsed as UTC midnight, so
 * there is no daylight-saving edge and no dependence on the viewer's timezone — a
 * blocker is the same age to an installer in Cornwall and a reviewer in a different
 * clock offset.
 */
export function fullDaysBetween(fromIsoDate: string, toIsoDate: string): number {
  const from = Date.parse(`${fromIsoDate.slice(0, 10)}T00:00:00Z`);
  const to = Date.parse(`${toIsoDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) {
    throw new Error(`fullDaysBetween: unparseable date (${fromIsoDate} -> ${toIsoDate})`);
  }
  return Math.floor((to - from) / MS_PER_DAY);
}

export type AgeBand = 'fresh' | 'ageing' | 'stale' | 'dead';

export const AGE_BAND_ORDER: readonly AgeBand[] = ['dead', 'stale', 'ageing', 'fresh'];

/**
 * Six weeks is the dead-lead threshold, so `dead` starts at 42 days. The two bands
 * below it split the gap: a week is when a nudge is due, three weeks is when the
 * invite has clearly failed on its own terms.
 */
export function ageBand(days: number): AgeBand {
  if (days >= 42) return 'dead';
  if (days >= 21) return 'stale';
  if (days >= 7) return 'ageing';
  return 'fresh';
}

export const AGE_BAND_LABELS: Readonly<Record<AgeBand, string>> = {
  fresh: 'Normal',
  ageing: 'Due a nudge',
  stale: 'Going cold',
  dead: 'Dead lead',
};

/** Short, human age for a row: "Today", "3 days", "2 weeks", "3 months". */
export function ageLabel(days: number): string {
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 14) return `${days} days`;
  if (days < 61) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
}
