#!/usr/bin/env node
/**
 * Renders docs/state-model.md from src/state/.
 *
 * The state model is code, and the copy table is a view of it. Keeping one source
 * of truth is what makes "the model survived five installer sessions without a state
 * being invented or removed" a reviewable diff rather than a matter of someone
 * noticing.
 *
 *   npm run state-table            write docs/state-model.md
 *   npm run state-table -- --check fail if it is stale (used by npm run check)
 *
 * Loads the TypeScript through Vite so the script resolves modules exactly as the app
 * does. Node's own type stripping cannot be used here: it requires explicit .ts
 * extensions on every relative import, which the app code correctly does not have.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createServer } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'docs/state-model.md');
const GENERATED_FROM = 'src/state/';

async function loadStateModel() {
  const server = await createServer({
    root: ROOT,
    configFile: false,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true },
  });
  try {
    return await server.ssrLoadModule('/src/state/index.ts');
  } finally {
    await server.close();
  }
}

const cell = (value) => {
  // An en dash, not an em dash. Em dashes are banned repo-wide and a guard test
  // enforces it; an empty cell in a wide table reads as a rendering fault.
  if (value === null || value === undefined) return '–';
  return String(value).replace(/\|/g, '\\|').replace(/\n+/g, ' ');
};

function renderTrack(track, ownerLabels) {
  const lines = [];
  lines.push(`## ${track.name}`);
  lines.push('');
  lines.push(track.description);
  lines.push('');
  lines.push('| State | Label the installer sees | What is blocking it | Whose job | Recommended action |');
  lines.push('|---|---|---|---|---|');
  for (const id of track.order) {
    const s = track.states[id];
    lines.push(
      `| \`${cell(id)}\` | ${cell(s.label)} | ${cell(s.blocker)} | ${cell(ownerLabels[s.owner])} | ${cell(s.action)} |`,
    );
  }
  lines.push('');
  lines.push('Permitted transitions:');
  lines.push('');
  for (const id of track.order) {
    const targets = track.transitions[id] ?? [];
    const rendered = targets.length === 0 ? '_terminal_' : targets.map((t) => `\`${t}\``).join(', ');
    lines.push(`- \`${id}\` -> ${rendered}`);
  }
  lines.push('');
  return lines;
}

function render(model) {
  const { TRACKS, OWNER_LABELS, PRODUCER_GAPS, REWARD_GBP, QUALIFYING_DAYS, ACTIVATION } = model;

  const lines = [];
  lines.push('# Lumo Hub, state model and copy table');
  lines.push('');
  lines.push(
    `> **Generated from \`${GENERATED_FROM}\` by \`npm run state-table\`. Do not edit by hand.**`,
  );
  lines.push('> Edit the source and re-run. `npm run check` fails when this file is stale.');
  lines.push('');
  lines.push(
    'Four independent tracks. A household sits in one state on each at all times, and the',
  );
  lines.push(
    'job of the UI is to make their combination legible. Every state carries the four',
  );
  lines.push(
    'things the design has to produce: the plain-English label, what is actually blocking',
  );
  lines.push('it, whose job it is to fix, and the recommended action.');
  lines.push('');
  lines.push(
    'Ownership is the field that matters more than it looks. Without it installers chase',
  );
  lines.push(
    'problems they cannot solve and stop trusting the list. "We could not control their',
  );
  lines.push(
    'battery, we are investigating" is a Lumo problem. "Their inverter connection has',
  );
  lines.push('dropped" is a phone call they can make today.');
  lines.push('');
  lines.push('Every blocker also carries its age. Three days is normal, six weeks is a dead');
  lines.push('lead, and the UI must not present them identically.');
  lines.push('');

  for (const track of TRACKS) {
    lines.push(...renderTrack(track, OWNER_LABELS));
  }

  lines.push('## Platform precedence for activation');
  lines.push('');
  lines.push(
    'The order `compute_account_state()` decides in. Lower wins. `Device Disconnected` and',
  );
  lines.push(
    '`Needs Relink` are evaluated before the underlying app-state derivation and therefore',
  );
  lines.push(
    'shadow everything below them: a household can be mid-way through setup AND offline,',
  );
  lines.push('and the platform will report offline.');
  lines.push('');
  lines.push('| Precedence | State | Counts toward the 30 days |');
  lines.push('|---|---|---|');
  const byPrecedence = [...ACTIVATION.order].sort(
    (a, b) => ACTIVATION.states[a].precedence - ACTIVATION.states[b].precedence,
  );
  for (const id of byPrecedence) {
    const s = ACTIVATION.states[id];
    lines.push(`| ${s.precedence} | \`${id}\` | ${s.countsTowardQualification ? 'Yes' : 'No'} |`);
  }
  lines.push('');

  lines.push('## Commercial rules');
  lines.push('');
  lines.push(
    `- **Qualification.** £${REWARD_GBP} per household, on ${QUALIFYING_DAYS} *consecutive* days in \`Smart Control Active\` measured`,
  );
  lines.push('  from first activation. Any drop resets the clock to zero.');
  lines.push(
    '- **Clawback.** Confirmed is final. Once the days are served the reward is not reversed,',
  );
  lines.push(
    '  even if control later drops. An installer cannot control a household unlinking six',
  );
  lines.push(
    '  months after the job. This is encoded structurally: `confirmed` has no transition to',
  );
  lines.push('  `lapsed`.');
  lines.push(
    `- The amount is flat. The household-side grid reward is banded by battery size, and`,
  );
  lines.push(
    '  whether the installer fee should band with it is an open question, held as one constant.',
  );
  lines.push('');

  lines.push('## States with no producer today');
  lines.push('');
  lines.push(
    'A deliberate output, not a caveat. Designing these here means the real build knows up',
  );
  lines.push(
    'front that it has to create them, rather than discovering it late and shipping a screen',
  );
  lines.push('that reports fiction.');
  lines.push('');
  for (const gap of PRODUCER_GAPS) {
    lines.push(`### ${gap.concept}`);
    lines.push('');
    lines.push(`- **Blocks the real build:** ${gap.blocksRealBuild ? 'yes' : 'no'}`);
    lines.push(`- **States affected:** ${gap.statesAffected.map((s) => `\`${s}\``).join(', ')}`);
    lines.push(`- **Why it is missing:** ${gap.whyMissing}`);
    lines.push(`- **What the real build must create:** ${gap.whatTheRealBuildMustCreate}`);
    lines.push(`- **Evidence:** ${gap.evidence}`);
    lines.push('');
  }

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

const model = await loadStateModel();
const rendered = render(model);

if (process.argv.includes('--check')) {
  let existing = null;
  try {
    existing = await readFile(OUTPUT, 'utf8');
  } catch {
    console.error(`docs/state-model.md is missing. Run: npm run state-table`);
    process.exit(1);
  }
  if (existing !== rendered) {
    console.error(
      'docs/state-model.md is stale: the state model has changed since it was generated.\nRun: npm run state-table',
    );
    process.exit(1);
  }
  console.log('docs/state-model.md is up to date.');
} else {
  await writeFile(OUTPUT, rendered, 'utf8');
  console.log(`Wrote docs/state-model.md from ${GENERATED_FROM}`);
}
