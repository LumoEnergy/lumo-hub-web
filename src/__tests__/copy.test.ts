import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * COPY RULES, ENFORCED MECHANICALLY.
 *
 * Both of these have been fixed by hand more than once and have come back both times,
 * because a convention nothing checks is a convention that decays. A grep in a test is
 * the cheapest possible enforcement.
 *
 * The em dash rule is a house style with a real reason behind it: it is the single
 * most recognisable tell of machine-written prose, and this product is asking
 * installers to trust an email we wrote on their behalf. It applies to comments too,
 * so nobody copies one out of a comment and into a screen.
 */

const ROOT = resolve(import.meta.dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx|mjs|css|html|md)$/.test(entry)) out.push(path);
  }
  return out;
}

const FILES = [
  ...walk(join(ROOT, 'src')),
  ...walk(join(ROOT, 'scripts')),
  ...walk(join(ROOT, 'docs')),
  join(ROOT, 'index.html'),
  join(ROOT, 'README.md'),
];

describe('house style', () => {
  it('contains no em dash anywhere, in copy, comments or docs', () => {
    const offenders = FILES.filter((file) => readFileSync(file, 'utf8').includes('\u2014')).map(
      (file) => file.slice(ROOT.length + 1),
    );
    expect(offenders, 'em dash found, use a comma, a colon or a full stop').toEqual([]);
  });

  it('uses no ellipsis character, for the same reason', () => {
    const offenders = FILES.filter((file) => readFileSync(file, 'utf8').includes('\u2026')).map(
      (file) => file.slice(ROOT.length + 1),
    );
    expect(offenders, 'ellipsis found, write three full stops or nothing').toEqual([]);
  });
});

/**
 * THE MONEY-HONESTY RULE, as a test rather than a paragraph in a spec.
 *
 * "28 households missing an address, that is £1,400 you cannot go after" reads
 * beautifully and is a lie: it prices the fix at a conversion rate nobody hits. It
 * shipped once. Presenting a theoretical maximum as money being lost to an installer
 * who has not been paid yet is the specific way this product lost the room before.
 *
 * Only two things may be multiplied by the per-household reward: money already earned
 * and money already at stake on control that is genuinely running.
 */
describe('money honesty', () => {
  // App source only. The smoke script and the screen tests have to quote the banned
  // phrases in order to check for them, so scanning them for the same strings just
  // finds the ban itself.
  const sources = FILES.filter(
    (f) => /\.tsx?$/.test(f) && f.includes(`${join('', 'src')}`) && !f.includes('__tests__'),
  );

  it('never phrases a count of blocked households as a sum of money', () => {
    const banned = [
      /that is £\{?\s*\w*\s*\*/,
      /on the table.*\*\s*REWARD_GBP/,
      /at stake.*length\s*\*\s*REWARD_GBP/,
    ];
    for (const file of sources) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of banned) {
        expect(pattern.test(text), `${file.slice(ROOT.length + 1)} multiplies a hope`).toBe(
          false,
        );
      }
    }
  });

  /**
   * A FORECAST OF THE FIRM'S EARNINGS is banned. The household's guaranteed grid
   * reward is not, and the distinction is the whole rule rather than a loophole in
   * it.
   *
   * "You are on track for £900" is a projection dressed as a fact: it depends on a
   * conversion rate nobody has measured, and it is the installer's money, so getting
   * it wrong costs trust we have not earned yet. "A guaranteed £150 a year" is a
   * commitment Lumo makes to the customer. One is a prediction about the future, the
   * other is a promise, and only the prediction can turn out to have been a lie.
   */
  it('never forecasts what the firm will earn', () => {
    const banned = /on track for|projected to earn|at this rate you|you could earn/i;
    for (const file of sources) {
      const text = readFileSync(file, 'utf8');
      expect(banned.test(text), `${file.slice(ROOT.length + 1)} forecasts`).toBe(false);
    }
  });
});
