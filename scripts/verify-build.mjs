#!/usr/bin/env node
/**
 * Asserts the built output is actually deployable, before it is deployed.
 *
 * This exists because of a specific failure: `base` in vite.config.ts rewrites the
 * URLs inside index.html but does not nest the output directory. The bundle landed at
 * dist/assets/... , the HTML asked for /d/<base>/assets/... , the SPA catch-all rewrite
 * answered with index.html and a text/html content type, the module failed to parse,
 * and every screen was blank.
 *
 * Nothing caught it. The unit tests mount components directly, so they never touch
 * the built HTML. A curl of the asset URL returned 200 and the right cache header,
 * because the header rule matched the request path while the body was the wrong file
 * entirely. A status code is not evidence that a file exists.
 *
 * So: parse the real index.html, and require every URL it references to resolve to a
 * real file on disk.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const problems = [];
const fail = (message) => problems.push(message);

/** DEMO_BASE, read as text, this is plain Node and cannot import a .ts module. */
const baseModule = readFileSync(join(ROOT, 'src/demoBase.ts'), 'utf8');
const baseMatch = baseModule.match(/export const DEMO_BASE = '([^']+)'/);
if (!baseMatch) {
  console.error('verify-build: could not find DEMO_BASE in src/demoBase.ts');
  process.exit(1);
}
const base = baseMatch[1];

if (!base.startsWith('/') || !base.endsWith('/')) {
  fail(`base ${base} must start and end with a slash`);
}

// 1. The entry HTML has to exist where the base path says it does.
const entry = join(DIST, base, 'index.html');
if (!existsSync(entry)) {
  console.error(
    `verify-build: no index.html at dist${base}. Did build.outDir stop matching base?`,
  );
  process.exit(1);
}
const html = readFileSync(entry, 'utf8');

// 2. Every site-absolute URL in the HTML has to resolve to a real file. This is the
//    check that catches the blank page.
const referenced = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]);
if (referenced.length === 0) {
  fail('index.html references no local assets, which cannot be right');
}
for (const url of referenced) {
  if (!url.startsWith(base)) {
    fail(`${url} is not under the base path ${base}, so it will 404 once deployed`);
    continue;
  }
  if (!existsSync(join(DIST, url))) {
    fail(`${url} is referenced by index.html but no such file exists in dist`);
  }
}

// 3. The Firebase rewrite has to point at the same base path. It is duplicated in
//    JSON that cannot import the Vite config, so it is checked rather than trusted.
const firebase = JSON.parse(readFileSync(join(ROOT, 'firebase.json'), 'utf8'));
const [site] = firebase.hosting;
const rewrites = site.rewrites ?? [];

if (rewrites.length !== 1) {
  fail(`expected exactly one rewrite, found ${rewrites.length}`);
} else {
  const [rewrite] = rewrites;
  if (rewrite.source !== `${base}**`) {
    fail(`rewrite source ${rewrite.source} does not match base ${base}**`);
  }
  if (rewrite.destination !== `${base}index.html`) {
    fail(`rewrite destination ${rewrite.destination} does not match ${base}index.html`);
  }
}

if (site.public !== 'dist') {
  fail(`hosting public is ${site.public}, expected dist`);
}

// 4. robots.txt has to be at the site root, not inside the base path, or it means
//    nothing.
if (!existsSync(join(DIST, 'robots.txt'))) {
  fail('dist/robots.txt is missing');
}
if (existsSync(join(DIST, base, 'robots.txt'))) {
  fail(`robots.txt is inside ${base}, where no crawler will look for it`);
}

// 5. Nothing that could reach a Lumo system should ever end up in the bundle. The
//    whole guarantee of this prototype is that it cannot send an email or write
//    anywhere, and that has to be true of the shipped artefact, not just the source.
const bundles = referenced.filter((url) => url.endsWith('.js'));
const forbidden = [
  ['firebase', /firebaseapp\.com|firebaseio\.com|googleapis\.com\/identitytoolkit/],
  ['HubSpot', /api\.hubapi\.com|hubspot/i],
  ['Supabase', /supabase/i],
  ['lumo-api', /lumo-api|run\.app/i],
];
for (const url of bundles) {
  const code = readFileSync(join(DIST, url), 'utf8');
  for (const [name, pattern] of forbidden) {
    if (pattern.test(code)) {
      fail(`${url} contains a reference to ${name}. This prototype must have no backend.`);
    }
  }
}

if (problems.length > 0) {
  console.error('verify-build failed:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  `verify-build: ok. ${referenced.length} referenced assets resolve, base ${base}, no backend in the bundle.`,
);
