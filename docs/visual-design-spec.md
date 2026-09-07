# Visual Design Spec — Lumo Hub (installer, mobile-first)

**Fidelity:** `rethink`
**Approved direction:** B, "Earnings-forward", with the first-run guard below
**Status:** binding for this repo. Where this and
`lumo-engineering-context/cross-repo/design-guide.md` disagree, this wins — that guide is
scoped to the consumer app and says so.

## Problem lock

**User.** A solar-and-storage installer, on a driveway or in a van, on their own phone,
one-handed, often in direct sunlight. Not at a desk. Not a Lumo employee.

**Job to be done.** "Who do I need to chase, and what have I earned?" — answered in about
five seconds, and adding a customer done in under sixty.

**Success look-and-feel.** A fast utility that is visibly about money. Not a CRM, not a
dashboard, not a marketing site.

## Why `rethink` rather than `evolve`

The consumer design guide describes a dark, calm, spacious, single-metric-per-card app for
a household checking their savings. Almost every one of its decisions is wrong for this
surface, and not by a little:

- Dark surfaces lose to direct sunlight, which is the actual research context.
- 28 to 32px card radii and 24px gutters fit two rows on a phone. This screen needs twelve.
- A 64px full-width pill button per action does not survive a list.
- "Calm" is the wrong target. An installer opens this to find out who is costing them £50.

What is kept, deliberately, so it still reads as Lumo: Figtree, the green as the single
accent, generous line height, plain-English copy, and line icons. What changes is density,
mode and radius. This is brand-adjacent, not brand-identical, and that is the intent.

## The two directions considered

**Direction A — "Worklist".** A pure utility. White, near-black text, one accent, no
decoration. Compact summary strip, then grouped rows, then a detail sheet. Reads like a
developer tool: maximum rows per screen, excellent in sunlight.
*Trade-off:* the better tool and the worse test. It looks like internal admin, and it puts
the proposition nowhere. In an investor demo it undersells; in research it invites feedback
about the table rather than about the offer.

**Direction B — "Earnings-forward".** The same list mechanics, but the money leads and every
blocker is attached to a number. Confirmed and pending totals sit above the queue, and each
pending row says what it is worth and what is holding it up.
*Trade-off:* leading with money on a screen showing £0 is exactly the "growth fantasy shown
to installers who have earned nothing" that the September product review called out. Guarded
below.

**Direction B is approved.** The reason is specific rather than aesthetic. The September
review's central finding was that Hub asked installers to do sustained work in exchange for
a return it could not show them. The only structural fix a UI can make is to render the
return on every screen and tie it to each individual blocker. Direction A is a nicer tool
and would not test the thing we are testing.

**First-run guard.** With zero customers, no money is shown at all — not £0, not a
projection, not a "you could earn" estimate. The hero is replaced by one sentence explaining
the offer and the add action. No forecast appears anywhere in this product.

## Layout

Single column throughout, 16px gutter. Laptop is the same layout centred in a 480px column;
there is no separate desktop design and none is needed.

Top to bottom, on every screen:

1. **Sticky app bar**, 52px. "Lumo Hub" wordmark left. A share icon right, which opens the
   personal link and QR sheet. Nothing else — no search, no filter, no avatar.
2. **Screen content**, scrolling.
3. **Bottom tab bar**, 56px plus safe-area inset. Three tabs: Customers, Add, Earnings.

Per screen:

- **Customers.** Summary strip (three figures: needs attention, earning, confirmed) ->
  segmented toggle `Needs attention | All` -> owner-grouped rows.
- **Add.** Single-customer form -> "Add several" disclosure -> contact-path fork -> confirmation.
- **Earnings.** Money hero (confirmed, pending) -> confirmed list -> pending list, each
  pending row carrying the activation blocker holding it up.

## Hierarchy and typography

Figtree, already loaded. Weights 400/500/600/700 only.

- **Money hero** 40px / 1.0 / 700, tabular numerals. The only display-scale type in the app.
- **Screen title** 24px / 1.2 / 700.
- **Section heading** (owner group) 13px / 1.2 / 600, sentence case, secondary colour.
  Deliberately *not* uppercase with letter-spacing — that pattern is in the consumer guide
  and it measurably slows scanning in a list.
- **Row primary** (customer name) 16px / 1.3 / 600.
- **Row secondary** (state label) 14px / 1.35 / 400.
- **Chip** 12px / 1.2 / 600.
- **Body** 15px / 1.45 / 400.
- **Button** 16px / 600.

Numbers that are compared to each other use `font-variant-numeric: tabular-nums`.

## Colour and surfaces

All new tokens, prefixed `--hub-*` and defined once in `src/theme.css`. They deliberately do
not reuse the `--lumo-*` names from `lumo-app-web/src/brand.css`: those values are a dark
palette, and silently rebinding a name that means "near-black background" to white is how a
shared token set becomes a trap.

```
--hub-page          #F6F7F8   app background
--hub-surface       #FFFFFF   cards and rows
--hub-surface-sunk  #EFF1F2   nested, input backgrounds
--hub-line          #E3E6E8   hairline borders and dividers
--hub-line-strong   #CDD3D6   input borders, focus outline base

--hub-text          #0E1113   primary
--hub-text-soft     #5B6469   secondary
--hub-text-mute     #8A9297   meta

--hub-accent        #12703A   Lumo green, darkened for legibility on white
--hub-accent-soft   #E8F7EA   accent background
--hub-accent-bright #7DE370   the consumer brand green, fills only, never text
```

**On the green.** `#7DE370` is a dark-UI green: on white it fails contrast for text at any
size. Rather than abandon the brand tie or ship unreadable text, the accent is a darkened
sibling of the same hue for anything with a glyph in it, and the original is retained for
fills and the QR frame where contrast is irrelevant. This is the one deviation most worth
challenging, and the alternative — a mid-grey accent with green used only decoratively — is
a legitimate answer if the brand view is stricter than mine.

### The colour rule that matters

**Age drives colour. Owner drives grouping. One dimension per channel.**

A two-dimensional colour system where hue means "whose job" and intensity means "how old" is
unreadable at a glance, which defeats the point. So:

```
fresh   (0-6 days)    neutral   text-soft on surface
ageing  (7-20 days)   amber     #B4690E on #FDF3E3
stale   (21-41 days)  orange    #9A4B0C on #FCEBDD
dead    (42+ days)    red       #B3261E on #FDECEA
```

Green is reserved for money and for earning. **Green never appears on a blocker**, including
in the "You can fix these" group — an actionable problem is not a good thing, and colouring
it green teaches installers to skim past it.

## Components

**Reuse:** nothing. This is a new repo with no component library, by decision — the surface
is three screens and hand-rolled components avoid pulling a dependency into what is meant to
be a disposable shell around two durable modules.

**New:**

- `AppBar`, `TabBar` — the shell.
- `SummaryStrip` — three figures, equal width, tap-through to the relevant view.
- `MoneyHero` — confirmed and pending. Suppressed entirely on first run.
- `OwnerGroup` — heading plus count, from `OWNER_GROUP_HEADINGS`.
- `CustomerRow` — name, state label, age chip, £ when relevant. 56px minimum, whole row tappable.
- `StateChip`, `AgeChip` — age chip is the only coloured element on a blocked row.
- `Sheet` — bottom sheet for customer detail, the share panel, and the invite preview.
  One implementation, three uses.
- `SegmentedToggle` — `Needs attention | All`.
- `Button` (primary, secondary, quiet), `Field`, `PasteGrid`, `CopyBlock`.
- `UnmatchedCallout` — see below.
- `EmptyState`, `ResetPill`.

**Explicitly forbidden:**

- Dark surfaces, radii above 16px, buttons taller than 48px, uppercase letter-spaced labels.
- Green on any blocker.
- A map. The live Hub has one; it is decoration that consumed a geocoder and a personal-data
  path for no decision an installer makes.
- Any chart, any energy time series, any state-of-charge or savings figure. Hub has no route
  to energy data and this build has no backend at all. Showing any of it, even as fixture
  data, would set an expectation the real build cannot meet on the timeline being tested.
- Any revenue projection or "you could earn" estimate, on any screen, in any persona.

## The unmatched treatment

`unmatched_different_email` is the state that silently eats an installer's £50, so it is the
one place the design breaks its own pattern. It does not render as a row in a group. It
renders as a full-width `UnmatchedCallout` pinned above the queue, with the household's name,
the amount at stake, and a single action. If there are several, the callout stacks them and
states the total exposed.

The test is that an installer in research spots it without being pointed at it. A row that
looks like every other row has already failed.

## Interaction

**Happy path, add a customer.** Tap Add -> four fields -> Continue -> choose *Lumo will
contact them* or *I'll contact them* -> confirmation naming the state the record is now in.
The default path is one customer; the five-row paste grid is behind an "Add several"
disclosure so a first-run installer never opens onto a spreadsheet.

- *Lumo will contact them* shows the exact email that would be sent, in full, before
  committing. Nothing is hidden behind "we'll take it from here".
- *I'll contact them* reveals a copyable subject and body with the personal link embedded,
  plus the QR. Copy buttons confirm inline.

**Secondary actions.** Tap a row for the detail sheet: the four state fields, the age, and
the £ position. Share icon in the app bar for the link and QR. A quiet reset pill in the
Customers screen footer that restores the persona.

**Motion.** 150 to 200ms ease on opacity and transform only. The sheet slides; nothing else
animates. A simulated 400ms pause on invite actions, so the demo feels like it did something
rather than teleporting.

## States

- **Loading.** None. Fixtures are synchronous and inventing spinners would misrepresent how
  the real thing will behave.
- **Empty (first run).** One sentence on the offer, then the add action as the hero. No money,
  no zeroes, no projection.
- **Empty (filtered).** "Nothing needs chasing" with a quiet route to the full list. This is a
  good outcome and should read as one.
- **Error.** Not reachable — there is no network call in the app. The router renders a plain
  not-found for any path outside the demo base.
- **Partial.** The normal case, and the whole point: a household can be invited, signed up,
  unmatched and not earning simultaneously, and the row has to say so without four badges.
  Resolution: the row shows the single most blocking state by precedence, and the detail sheet
  shows all four tracks.

## IA / nav fit

Three tabs, no nesting, no back-stack except sheets. Every screen is one tap from every other
screen. The personal link is in the app bar rather than on a screen of its own because it is
the one thing that costs an installer no ongoing effort and should never be more than one tap
away.

## Design-guide impact

**No change to `design-guide.md`, deliberately.** Two reasons. That guide is the consumer
app's, and this is a different audience with opposite density needs. And the guide already
carries an unresolved naming split — it documents `--color-*` tokens while the app implements
`--lumo-*` — so adding a third namespace to it would compound a known problem.

The `--hub-*` tokens stay local to this repo. If the real build proceeds, promoting them to a
shared installer token set is a decision to take then, with the research behind it.

## Open questions

1. The darkened accent (`#12703A`). Legibility says derive a darker green; a stricter brand
   view might prefer the brand green as decoration only, with a neutral accent. Worth a look
   on a real phone in daylight before it is settled.
2. Whether the summary strip should show "needs attention" as a count or as money at stake.
   Money is more motivating and more honest about why the list matters; a count is less
   likely to be misread as an amount owed. Currently a count, with money on the rows.
3. Whether the invite preview should be editable on the *I'll contact them* path. Editable is
   more useful and makes the copy untestable. Currently read-only and copyable.
