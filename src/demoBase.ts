/**
 * The unguessable path the demo is served from.
 *
 * SINGLE SOURCE OF TRUTH, imported by all four places that need it:
 *   - vite.config.ts, as `base` and as the nested `build.outDir`
 *   - App.tsx, as the router basename
 *   - PersonalLink.tsx, to build the QR target
 *   - scripts/verify-build.mjs, which asserts firebase.json agrees
 *
 * It is a real constant rather than `import.meta.env.BASE_URL` because BASE_URL is
 * only populated by a Vite build, under Vitest it is `/`, so a router basename read
 * from it could not be tested at all. That is not a hypothetical: the first version
 * of this app read BASE_URL directly, and the one thing no test could check was
 * whether the router would mount.
 *
 * The demo is unlisted: it is served from here rather than the site root, and
 * Firebase 404s everything outside it. That is obscurity, not security, and is only
 * proportionate because the bundle holds no real data and no credential.
 */
export const DEMO_BASE = '/d/3FgvdyiYBsD9/';
