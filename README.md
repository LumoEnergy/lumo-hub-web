# lumo-hub-web

A front-end-only, fully clickable Lumo Hub. No backend, no auth, no database, no email.

It exists to settle the experience and the state model before anything is wired up, and to
be usable both in internal and investor demos and in installer research sessions. It is
**not** the product, and it cannot become the product by accident: there is no Firebase SDK,
no secret and no network path to any Lumo system anywhere in this repo, so a real build is
a deliberate act rather than a drift.

## The two durable outputs

Everything in `src/components/` is disposable. Two things are not, and are written as
production code:

- **`src/state/`** — the state definitions, permitted transitions, ownership and copy.
  This is intended to survive into the real product largely unchanged.
- **`src/fixtures/`** — the typed personas. The view model they are shaped as is the data
  contract the real build gets constructed against.

`docs/state-model.md` is **generated** from `src/state/` by `npm run state-table`. Do not
edit it by hand; edit the source and re-run. `npm run check` fails if it is stale, so a
state added or removed always shows up as a reviewable diff.

## Personas

Persona selection is URL-encoded so a specific scenario can be shared as a link.

- `?p=established` (default) — a 20-plus customer portfolio, mostly earning, two live
  blockers. The investor and internal demo.
- `?p=first-run` — zero customers. Tests whether the empty product still explains itself.
- `?p=messy` — eight invited, five stuck at different stages, one email that never matched,
  one confirmed £50. The research conversation.

Research fidelity wins where the two audiences conflict. The aspirational demo path is a
subset of a complete state model, so you can always demo the good story by choosing a
flattering persona — but you cannot run credible research from a happy-path-only model.

Interaction state lives in memory, so adding a customer makes it appear in the list. The
shell carries a visible reset.

## Commercial rules encoded here

Both were settled in scoping and are expressed in `src/state/earnings.ts`:

- **Qualification** — £50 per household, on 30 **consecutive** days in `Smart Control
  Active` measured from first activation. Any drop resets the clock.
- **Clawback** — confirmed is final. Once the 30 days are served the £50 is not reversed,
  even if control later drops. The installer cannot control a household unlinking six
  months later.

The £50 is a flat amount here, deliberately held as a single constant, because the
household-side grid reward is banded by battery size and banding the installer fee too is
an open commercial question rather than a decided one.

## Running it

```bash
npm install
npm run dev
npm test
npm run check
```

The app is served from an unguessable path (`DEMO_BASE` in `src/demoBase.ts`), the host
404s everything outside it, and `noindex` is set in three places. That is obscurity, not
security, and is only proportionate because there is no real data here.

## Deployment

Dev only. See `AGENTS.md`.

## The decision point

After five installer sessions, a written call: build the real one, change the proposition,
or stop. The named outputs of that decision are the approved screens, the state and copy
table, and the fixture module as the data contract.

The failure mode to guard against is a demo that quietly becomes the product because
polishing it is easier than making it real. If this repo is still being polished and no
written call has been made, that is the thing that has gone wrong.
