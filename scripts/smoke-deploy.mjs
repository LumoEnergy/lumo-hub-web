#!/usr/bin/env node
/**
 * Loads the deployed demo in a real browser, runs its JavaScript, and asserts that
 * each persona actually puts content on the screen.
 *
 * scripts/verify-build.mjs guards the artefact; this guards the deploy. Both exist
 * because the first deploy of this repo passed every check that looked at status
 * codes and headers while showing a blank page on every screen. A 200 with the right
 * cache header told us nothing: the body was the wrong file entirely.
 *
 * A REAL BROWSER, not jsdom. The first version of this script used jsdom and
 * confidently reported a blank page for all three personas after the bug was already
 * fixed, jsdom does not execute `<script type="module">`, so it never ran the bundle
 * at all. A check that reports failure when the page is fine is worse than no check.
 *
 * Chrome is driven through --dump-dom rather than Playwright to avoid adding a
 * ~300MB browser download to a prototype repo. If Chrome is absent this exits
 * non-zero saying it could not check, rather than passing quietly.
 *
 * Usage:
 *   npm run smoke                                     the dev deploy
 *   npm run smoke -- http://localhost:8090            a local dev server
 *   CHROME=/path/to/binary npm run smoke
 */
import { existsSync, readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEV_HOST = 'https://lumo-hub-demo-dev-opt.web.app';

const CHROME_CANDIDATES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((path) => existsSync(path));
if (!chrome) {
  console.error('smoke: no Chrome-family browser found, so the deploy was NOT checked.');
  console.error('       Set CHROME=/path/to/binary, or verify by hand in a browser.');
  process.exit(1);
}

const baseModule = readFileSync(join(ROOT, 'src/demoBase.ts'), 'utf8');
const base = baseModule.match(/export const DEMO_BASE = '([^']+)'/)?.[1];
if (!base) {
  console.error('smoke: could not find DEMO_BASE in src/demoBase.ts');
  process.exit(1);
}

const argument = (process.argv[2] ?? DEV_HOST).replace(/\/$/, '');
const origin = argument.includes(base) ? argument.split(base)[0] : argument;

/**
 * What each persona has to prove, beyond simply not being blank.
 *
 * An unknown `?p=` falls back to the default persona rather than erroring, so a
 * stale id here would render a perfectly good page and pass on the wrong scenario.
 * Every persona therefore asserts something only it shows. The label check is the
 * backstop: the shell prints the active persona, so a fallback cannot pass silently.
 */
const PERSONAS = [
  {
    id: 'mid-campaign',
    path: '',
    expect: [
      /Demo: Mid-campaign/,
      // The dashboard, which is the whole point of the landing page: the funnel and
      // the money, not a list of chores.
      /Where your customers are/,
      /Earned by Northfield Renewables/,
      /On your list/,
      /Earning/,
    ],
    reject: [/Nothing has been sent yet/],
  },
  {
    id: 'awaiting-approval',
    path: '',
    expect: [
      /Demo: Awaiting approval/,
      /Nothing has been sent yet/,
      /approve the email once/,
    ],
    // Nothing has sent, so there is no money and there must be no guess at any.
    reject: [/Earned by/, /could earn/i, /projected/i],
  },
  {
    id: 'messy-list',
    path: '',
    expect: [/Demo: Messy list/, /Where your customers are/, /No address/],
    reject: [/Nothing has been sent yet/],
  },
];

/**
 * The other two tabs, checked on the demo persona.
 *
 * Route coverage exists because the tabs were renumbered: the landing page became
 * the dashboard, earnings folded into customers, and `list` became `campaign`. A
 * check that only ever loaded `/` would have passed while two of the three tabs
 * 404ed, which is the same class of failure as the blank page this script was
 * written for.
 */
const ROUTES = [
  {
    id: 'customers',
    path: 'customers',
    // No view named, so this is also the check that the default is Invited.
    expect: [/Customers/, /Household/, /Reward/, /Email opened/, /Households we have emailed/],
    // The column nobody understood, the status jargon, the banner that shouted about
    // money on every visit, and the undifferentiated list that used to open first.
    reject: [/Whose/, /possible match/i, /going to nobody/i, /Everyone on your list/],
  },
  {
    id: 'customers-needs-you',
    path: 'customers?view=attention',
    expect: [/What to do/, /Add an email address/, /already earned and going to nobody/],
    reject: [/Whose/],
  },
  {
    id: 'customers-active',
    path: 'customers?view=active',
    expect: [/Inverter/, /Control/, /Live for/],
    // A reward clock that has not begun is "Not started", not a missing value.
    reject: [/state of charge/i, /not given/],
  },
  {
    id: 'campaign',
    path: 'campaign',
    expect: [
      /Campaign/,
      /commusoft-battery-jobs/,
      /Still processing/,
      /When it goes out/,
      /Email campaign setup/,
      /Send from your own domain/,
      /Get Lumo now/,
      /guaranteed £150 per year/,
    ],
    reject: [/Your list/, /exact duplicates/i, /What the DNS change involves/],
  },
  {
    id: 'settings',
    path: 'settings',
    expect: [/Your team/, /Admin/, /Viewer/, /Invite sent/],
    reject: [/sort code/i],
  },
  {
    // The only check that lets the guide open. Everything else suppresses it so the
    // screen underneath is what gets tested rather than an overlay covering it.
    //
    // Step one only. This renders a page and reads it, it does not click, so the
    // later steps are not in the DOM. What it is proving is that the guide opens on a
    // fresh load at all, which is the part that cannot be tested in jsdom because it
    // depends on a real page load. The step content and the money wording are
    // asserted in `src/__tests__/App.test.tsx`, where the assertion can be scoped to
    // the dialog: page-wide here, a reject on large money figures catches the
    // dashboard's real earned total sitting behind the overlay.
    id: 'first-open guide',
    path: '',
    guide: true,
    expect: [
      /Getting started/,
      /Welcome to Lumo/,
      /Northfield Renewables earns/,
      /£50 per household/,
      /stays connected for 30 days/,
    ],
    reject: [/savings/i, /state of charge/i],
  },
];

/**
 * Copy that must never appear anywhere, on any page, in any persona.
 *
 * The review notes that changed the product: no individual framing, and no money
 * that depends on a conversion rate nobody has measured.
 *
 * `per year` used to be on this list and has been deliberately removed. The campaign
 * email now leads on the household's guaranteed grid reward, which is an annual
 * figure and is a commitment rather than a forecast. What stays banned is a
 * prediction about what the FIRM will earn.
 */
const NEVER = [
  /your personal link/i,
  /QR code/i,
  /you could earn/i,
  /projected/i,
  /on track for/i,
  // Built from the code point so this file does not itself contain the character
  // it bans, which is the only way to keep the repo-wide em dash test happy.
  new RegExp(String.fromCharCode(0x2014)),
];

async function renderedText(url) {
  const { stdout } = await run(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--virtual-time-budget=8000',
      '--dump-dom',
      url,
    ],
    { maxBuffer: 32 * 1024 * 1024 },
  );

  const root = stdout.match(/<div id="root">([\s\S]*)<\/div>\s*<\/body>/);
  const inner = root?.[1] ?? '';
  const text = inner
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&pound;/g, '£')
    .replace(/\s+/g, ' ')
    .trim();
  return { text, bytes: inner.length };
}

let failed = false;

const CHECKS = [
  ...PERSONAS.map((p) => ({ ...p, persona: p.id, name: `persona ${p.id}` })),
  ...ROUTES.map((r) => ({ ...r, persona: 'mid-campaign', name: `route /${r.path}` })),
];

for (const check of CHECKS) {
  // A path may already carry a query, the customer views are addressed by one, so the
  // persona joins with & rather than a second ?. Appending ? unconditionally produced
  // `customers?view=attention?p=...`, which the router reads as a single view value of
  // "attention?p=mid-campaign", falls back to Invited, and fails on the wrong screen.
  //
  // `guide=off` unless the check is the one testing the guide. The walkthrough opens
  // over every screen on a fresh load, which is the point of it, and would otherwise
  // mean every check here was reading an overlay instead of the page.
  const query = [`p=${check.persona}`, check.guide ? null : 'guide=off']
    .filter(Boolean)
    .join('&');
  const url = `${origin}${base}${check.path}${check.path.includes('?') ? '&' : '?'}${query}`;
  const problems = [];
  let text = '';

  try {
    const rendered = await renderedText(url);
    text = rendered.text;
    if (rendered.bytes === 0) problems.push('#root is empty, blank screen');
    for (const pattern of check.expect) {
      if (!pattern.test(text)) problems.push(`missing expected ${pattern}`);
    }
    for (const pattern of [...check.reject, ...NEVER]) {
      if (pattern.test(text)) problems.push(`unexpectedly present: ${pattern}`);
    }
  } catch (error) {
    problems.push(`browser failed: ${error.message}`);
  }

  if (problems.length > 0) {
    failed = true;
    console.error(`FAIL ${check.name}  ${url}`);
    for (const problem of problems) console.error(`       ${problem}`);
    console.error(`       rendered: ${text.slice(0, 200) || '(nothing)'}`);
  } else {
    console.log(`ok   ${check.name.padEnd(26)} "${text.slice(0, 60)}..."`);
  }
}

if (failed) {
  console.error('\nsmoke failed: the deploy does not render as expected.');
  process.exit(1);
}
console.log(`\nsmoke: ok. ${CHECKS.length} checks passed at ${origin}${base}`);
