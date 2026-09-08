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
 * fixed — jsdom does not execute `<script type="module">`, so it never ran the bundle
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

/** What each persona has to prove, beyond simply not being blank. */
const PERSONAS = [
  {
    id: 'established',
    expect: [/Your customers/, /Earning/, /£/],
    // The investor demo is worthless if the portfolio reads as empty.
    reject: [/No customers yet/],
  },
  {
    id: 'first-run',
    expect: [/first customer/i],
    // The empty state must not invent a portfolio or a forecast.
    reject: [/Need chasing/, /Yours so far/],
  },
  {
    id: 'messy',
    // The whole point of this persona is that the unmatched household is visible.
    expect: [/Your customers/, /nothing ties them to you|possible match/i, /Needs attention/],
    reject: [/No customers yet/],
  },
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

for (const persona of PERSONAS) {
  const url = `${origin}${base}?p=${persona.id}`;
  const problems = [];
  let text = '';

  try {
    const rendered = await renderedText(url);
    text = rendered.text;
    if (rendered.bytes === 0) problems.push('#root is empty — blank screen');
    for (const pattern of persona.expect) {
      if (!pattern.test(text)) problems.push(`missing expected ${pattern}`);
    }
    for (const pattern of persona.reject) {
      if (pattern.test(text)) problems.push(`unexpectedly present: ${pattern}`);
    }
  } catch (error) {
    problems.push(`browser failed: ${error.message}`);
  }

  if (problems.length > 0) {
    failed = true;
    console.error(`FAIL ${persona.id}  ${url}`);
    for (const problem of problems) console.error(`       ${problem}`);
    console.error(`       rendered: ${text.slice(0, 200) || '(nothing)'}`);
  } else {
    console.log(`ok   ${persona.id.padEnd(12)} "${text.slice(0, 70)}…"`);
  }
}

if (failed) {
  console.error('\nsmoke failed: the deploy does not render as expected.');
  process.exit(1);
}
console.log(`\nsmoke: ok. all ${PERSONAS.length} personas render at ${origin}${base}`);
