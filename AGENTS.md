# lumo-hub-web — agent notes

Front-end-only clickable prototype of the installer-facing Lumo Hub. React + Vite + Tailwind,
no backend of any kind.

## Hard boundaries

- **No Firebase SDK, no Supabase, no HubSpot, no `lumo-api`, no Enode.** Nothing in this
  repo may be capable of sending an email, writing to a CRM, or touching real data. That
  is the point of the build, not an oversight — it keeps the lawful-basis question a real
  decision rather than an implicit one.
- **No secrets.** If a change needs a credential, the change is out of scope.
- Do not add leads, deals, a sizing calculator, a marketing asset library, revenue
  projections, admin screens, impersonation or CSV import. All were deliberately cut.

## The two files that are not disposable

`src/state/` and `src/fixtures/` are the durable outputs and are written as production
code. Treat a change to either as a contract change:

- `src/state/activation.ts` mirrors a **real platform enum**. The source of truth is
  `compute_account_state()` in `../lumo-app-web/functions/utils/hubspot_payloads.py`, and the
  HubSpot picklist in `../lumo-app-web/scripts/create_hubspot_fields.py`. There are ten
  platform values plus one Hub-only value. `src/state/__tests__/activation.test.ts` asserts
  the list verbatim — if it fails, reconcile against the Python, do not edit the expectation
  to match the code.
- Three state concepts have **no producer in the platform today** and are flagged as such in
  `src/state/producerGaps.ts`. Do not quietly drop the flag to make a screen simpler.

`docs/state-model.md` is generated. Run `npm run state-table` after any state change;
`npm run check` fails when it is stale.

## Before changing UI

Fidelity is **`rethink`**, settled in scoping. `docs/visual-design-spec.md` is the binding
artefact, not `lumo-engineering-context/cross-repo/design-guide.md` — that guide is scoped
to the consumer app (dark, mobile, calm) and this is a light, denser, list-first installer
tool. Read the spec first and follow it.

## Deployment

Dev only. Prod is not configured and should not be, while this is a prototype.

```bash
cd lumo-hub-web
npm run check
npm run build
firebase deploy --only "hosting:hub-demo-dev" --project lumo-dev-optimizer
```

Live at `https://lumo-hub-demo-dev-opt.web.app/d/3FgvdyiYBsD9/`. Verify against that path,
not the site root — the root 404s, which is intended. The path comes from `DEMO_BASE` in
`src/demoBase.ts`; change it there and the URL changes with it.

**A 200 is not evidence the deploy worked.** The first deploy of this repo returned 200 on
every asset URL and showed a blank page on every screen: the SPA rewrite was answering
asset requests with `index.html`, so the browser got `text/html` where it expected
JavaScript. `npm run build` now runs `scripts/verify-build.mjs`, which fails the build if
any URL in the built HTML has no matching file. When checking a deploy by hand, look at
the content type and size, not the status code:

```bash
curl -sI https://lumo-hub-demo-dev-opt.web.app/d/3FgvdyiYBsD9/ | rg -i "^(HTTP|content-type)"
```

The hosting site `lumo-hub-demo-dev-opt` already exists. To recreate it:

```bash
firebase hosting:sites:create lumo-hub-demo-dev-opt --project lumo-dev-optimizer
```

Never a bare `firebase deploy` from here, and never `functions`, `firestore` or `storage` —
this repo owns none of them.

## Deeper context

- `../lumo-engineering-context/cross-repo/lumo-hub.md` — what the live Lovable Hub is, and
  its governance position
- `../lumo-engineering-context/reviews/2026-09-04-lumo-hub-product-review.md` — why this
  rebuild exists and what was deliberately cut
- `../lumo-engineering-context/reviews/2026-08-06-lumo-hub-360-review.md` — the missing
  installer entity, which gates the real build
