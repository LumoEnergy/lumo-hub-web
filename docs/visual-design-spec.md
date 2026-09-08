# Visual Design Spec — Lumo Hub (installer, desktop-first)

**Fidelity:** `rethink`
**Approved direction:** B, "Earnings-forward", with the pre-send guard below
**Status:** binding for this repo. Where this and
`lumo-engineering-context/cross-repo/design-guide.md` disagree, this wins — that guide is
scoped to the consumer app and says so.

## Problem lock

**User.** The person at a solar-and-storage firm who owns the customer relationship — an
owner-operator, an office manager, sometimes a sales lead. At a desk more often than not.
**A company, not an individual.** Lumo's customer is the firm; the firm decides internally
whether an engineer gets a cut of anything.

**Job to be done.** "What happened to the list I gave you, what has it earned me, and is
there anything only I can unblock?" — answered in about ten seconds.

**The premise that shapes everything.** The firm has already handed over its back-book and
Lumo runs the campaign. This product does not ask them to add customers, write emails or
record work they did elsewhere. It reports, and it asks for help in exactly one place.

**Success look-and-feel.** A credible business system that is visibly about money. It has
two audiences and they want the same thing from the visual design: an installer needs to
believe Lumo is a real operation before handing over a customer list, and an investor needs
to see that the channel is instrumented. Both are served by looking like software a company
would pay for, and both are lost by looking like a spreadsheet with a logo.

## Desktop first, and why mobile is not a smaller desktop

The primary surface is a laptop. That is a change from the first version of this spec, which
assumed an engineer on a driveway.

**The rule: desktop manages the portfolio, mobile works the job.** These are different jobs
and should not be forced into one responsive compromise.

| | Desktop (>= 1024px) | Mobile (< 768px) |
|---|---|---|
| Primary job | Read the whole list, sort it, find patterns | Fix one thing, add one household |
| Customers | Sortable data table, all rows | Card list, needs-attention first |
| Chrome | Persistent left sidebar | Bottom tab bar |
| Density | 44px rows | 64px cards |
| Table columns | All seven | Name, status, age only |

Tablet (768–1023px) takes the desktop sidebar collapsed to icons and the mobile card list.
It is a compromise band and is not designed for beyond not breaking.

What mobile deliberately does **not** get: the data table, column sorting, and the import
and approval flows. Nobody approves a campaign to two hundred households on a phone, and a
table squeezed into 390px is a table nobody can read.

## Why `rethink` rather than `evolve`

The consumer design guide describes a dark, calm, spacious, single-metric-per-card app for a
household checking their savings. Almost every one of its decisions is wrong for this
surface:

- Dark surfaces are wrong for a business tool used next to a spreadsheet and a CRM all day.
- 28 to 32px card radii and 24px gutters fit two rows on a phone. This screen needs forty.
- A 64px full-width pill button per action does not survive a table.
- "Calm" is the wrong target. A firm opens this to find out what their list earned.

What is kept, deliberately, so it still reads as Lumo: Figtree, the green as the single
accent, generous line height, plain-English copy, line icons. What changes is density, mode
and radius. Brand-adjacent, not brand-identical, and that is the intent.

## The two directions considered

**Direction A — "Worklist".** A pure utility. White, near-black text, one accent, no
decoration. Compact table, no money hero, blockers only.
*Trade-off:* the better tool and the worse test. It looks like internal admin, it puts the
proposition nowhere, and it invites feedback about the table rather than about the offer.

**Direction B — "Earnings-forward".** The same table mechanics, but the money leads and
every blocker is attached to a number. Paid, confirmed and in-flight totals sit above the
list, and each held or blocked row says what it is worth.
*Trade-off:* leading with money on a screen showing nothing earned yet is exactly the
"growth fantasy shown to installers who have earned nothing" that the September product
review called out. Guarded below.

**Direction B is approved.** The reason is specific rather than aesthetic. The September
review's central finding was that Hub asked installers to do sustained work in exchange for
a return it could not show them. This rebuild removes almost all of the work; rendering the
return on every screen is what makes the remaining ask — one approval, and a short list of
missing email addresses — obviously worth doing.

**Pre-send guard.** Before a campaign has sent, no money is shown at all — not zero, not a
projection, not a "you could earn" estimate. The hero is replaced by the state of the list
and the one action outstanding. **No forecast appears anywhere in this product, in any
persona.** The `awaiting-approval` persona exists to test that this holds.

## Layout

### Desktop

```
+----------------+--------------------------------------------------+
| Northfield     |  Your customers                            237  |
| Renewables     |                                                  |
| Ade Bankole    |  [ 34 need you ] [ 21 earning ] [ £700 paid ]    |
|                |                                                  |
| Customers      |  +--- Only you can fix these (34) -----------+   |
| Earnings       |  | 28 missing an email address    [ Fix ]    |   |
| Your list      |  +-------------------------------------------+   |
|                |                                                  |
|                |  Household   Status   Whose  Age   £    Added by |
|                |  --------------------------------------------    |
| Reset demo     |  ...                                             |
+----------------+--------------------------------------------------+
  240px fixed        max 1200px, 32px gutter
```

1. **Sidebar**, 240px, fixed, full height. Company name and current seat at the top — the
   company name is the largest text in it, because the account is the firm. Three nav items.
   A quiet reset at the bottom.
2. **Main**, scrolling, 1200px maximum, 32px gutter. Page title with a total count, then a
   summary strip, then the fix callout when there is one, then the content.

### Mobile

1. **App bar**, 52px. Company name left, current seat right. No share icon — there is no
   personal link in this product.
2. **Content**, scrolling, 16px gutter.
3. **Bottom tab bar**, 56px plus safe-area inset. Customers, Earnings, Your list.

### Per screen

- **Customers.** Summary strip → fix callout → unmatched callout → `Needs you | All` toggle
  → table (desktop) or owner-grouped cards (mobile).
- **Earnings.** Money hero → paid → confirmed → in flight → not earning, each row carrying
  the blocker holding it up.
- **Your list.** The import report → the campaign email with its preview → permission →
  the newsletter link → add a household.

## Hierarchy and typography

Figtree, already loaded. Weights 400/500/600/700 only.

- **Money hero** 40px / 1.0 / 700, tabular numerals. The only display-scale type in the app.
- **Screen title** 28px desktop, 24px mobile / 1.2 / 700.
- **Section heading** 13px / 1.2 / 600, sentence case, secondary colour. Deliberately *not*
  uppercase with letter-spacing — that pattern is in the consumer guide and it measurably
  slows scanning in a list.
- **Table header** 12px / 1.2 / 600, secondary colour, sentence case.
- **Row primary** 15px desktop, 16px mobile / 1.3 / 600.
- **Row secondary** 13px desktop, 14px mobile / 1.35 / 400.
- **Chip** 12px / 1.2 / 600.
- **Body** 15px / 1.45 / 400.
- **Button** 15px desktop, 16px mobile / 600.

Numbers that are compared to each other use `font-variant-numeric: tabular-nums`. This is
not cosmetic on a table of 237 rows.

## Colour and surfaces

All new tokens, prefixed `--hub-*` and defined once in `src/theme.css`. They deliberately do
not reuse the `--lumo-*` names from `lumo-app-web/src/brand.css`: those values are a dark
palette, and silently rebinding a name that means "near-black background" to white is how a
shared token set becomes a trap.

```
--hub-page          #F6F7F8   app background
--hub-surface       #FFFFFF   cards, rows, table
--hub-surface-sunk  #EFF1F2   nested, input backgrounds, table header
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
fills where contrast is irrelevant. This is the one deviation most worth challenging, and
the alternative — a mid-grey accent with green used only decoratively — is a legitimate
answer if the brand view is stricter than mine.

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
in the "only you can fix these" group — an actionable problem is not a good thing, and
colouring it green teaches installers to skim past it.

**A campaign-specific corollary.** The silent majority of any back-book campaign never
responds, and those rows must read as neutral fact rather than as failure. `no_response` at
26 days would otherwise paint a third of the table orange, which is both demoralising and
wrong: nobody did anything incorrectly. Age banding therefore applies only to rows the firm
or the household can act on. States owned by nobody — no response after we have stopped
chasing, unsubscribed, marked as spam — render neutral at any age.

## Components

**Reuse:** nothing. This is a new repo with no component library, by decision — the surface
is four screens and hand-rolled components avoid pulling a dependency into what is meant to
be a disposable shell around two durable modules.

**New:**

- `Sidebar`, `AppBar`, `TabBar` — the shell, responsive between the first and the last two.
- `SummaryStrip` — three or four figures, equal width.
- `MoneyHero` — paid, confirmed, in flight. Suppressed entirely before a send.
- `CustomerTable` — desktop. Sortable headers, 44px rows, whole row opens the detail.
- `OwnerGroup` + `CustomerCard` — mobile. Heading and count from `OWNER_GROUP_HEADINGS`.
- `FixCallout` — the aggregated "only you can fix these", above the list.
- `UnmatchedCallout` — see below.
- `EmailPreview` — the campaign email rendered as it arrives, including the From line.
- `ImportReport` — supplied, loaded, held, rejected, with the reason.
- `StateChip`, `AgeChip`, `OwnerChip`.
- `Sheet` — bottom sheet on mobile, centred dialog on desktop. One implementation.
- `SegmentedToggle` — `Needs you | All`.
- `Button` (primary, secondary, quiet), `Field`, `PasteGrid`, `CopyBlock`.
- `EmptyState`, `ResetPill`.

**Explicitly forbidden:**

- Dark surfaces, radii above 16px, uppercase letter-spaced labels.
- Green on any blocker.
- **Any personal link, personal QR code, or per-person attribution.** The account is the
  company. A company link exists for the firm's own newsletter and lives on `Your list`,
  framed as content to paste into a channel they already own — not as a way to add someone.
- A map. The live Hub has one; it is decoration that consumed a geocoder and a personal-data
  path for no decision an installer makes.
- Any chart, any energy time series, any state-of-charge or savings figure. Hub has no route
  to energy data and this build has no backend at all. Showing any of it, even as fixture
  data, would set an expectation the real build cannot meet on the timeline being tested.
- Any revenue projection or "you could earn" estimate, on any screen, in any persona.
- Any control that asks the firm to record something they did outside the product.

## The two callouts that break the pattern

Two states are worth more than a row, and both get a full-width callout above the list.

**Unmatched.** `unmatched_different_email` silently eats a £50: the household is on Lumo and
earning, the firm did the work, and the row looks like a lead that never converted. The
callout names the household, the amount at stake, and one action. Several stack, with the
total exposed.

**Data quality.** `held_no_email`, `held_unconfirmed` and `bounced` are the work this product
asks for, and each is stated once in aggregate with the money attached: "28 households are
missing an email address. That is £1,400 we cannot go after." An itemised list of 28 rows is
a chore; one number with a total is an argument.

**Aggregate the data problems, itemise the people.** `clicked` is the exception and is listed
row by row with names, because those are twelve specific humans a firm would ring, and a name
is what makes that possible. The distinction is the useful one: a data problem is a batch job,
a warm lead is a person.

The test for all of these is that someone in research spots them without being pointed at
them.

## Interaction

**The one-approval path.** `Your list` → read the import report → read the email exactly as
it will arrive → approve. One button, one confirmation naming how many households will be
contacted and over what period. Nothing is hidden behind "we'll take it from here".

**The sender ladder, as a named research probe.** The email preview shows the From line, the
reply-to and the authenticating domain, and offers the two rungs explicitly:

- *Rung 1, nothing to do* — Lumo's sending domain, the firm's display name and reply-to.
  Arrives as the firm, with a small "via" note in some clients.
- *Rung 2, two DNS records* — the firm delegates a subdomain of their own domain by
  publishing a DKIM key. Authenticates as them and insulates their main domain's reputation.

This is presented as a choice with its cost stated, because which rung installers will
actually accept is unknown and is one of the things the five sessions are for. It must not be
presented as a recommendation.

**Secondary actions.** Click or tap a row for the detail: the four track states, the age, the
money position, who supplied the row and on which import. Add a household is a secondary
button on `Your list`, with the paste grid as the default form rather than a single-record
form — a firm adding one household by hand is the rare case now.

**Motion.** 150 to 200ms ease on opacity and transform only. The sheet slides, the dialog
fades; nothing else animates. A simulated 400ms pause on approve, so the demo feels like it
did something rather than teleporting.

## States

- **Loading.** None. Fixtures are synchronous and inventing spinners would misrepresent how
  the real thing will behave.
- **Empty (nothing sent yet).** The import report and the one outstanding approval. No money,
  no zeroes, no projection.
- **Empty (no list at all).** One paragraph on what to send and where, and nothing else. This
  state is reachable in the app but has no persona, because a firm in it has not yet had the
  conversation that this product is downstream of.
- **Empty (filtered).** "Nothing needs you" with a quiet route to the full list. This is a
  good outcome and should read as one.
- **Error.** Not reachable — there is no network call in the app. The router renders a plain
  not-found for any path outside the demo base.
- **Partial.** The normal case, and the whole point: a household can be emailed, signed up,
  unmatched and not earning simultaneously, and the row has to say so without four badges.
  Resolution: the row shows the single most blocking state by precedence, and the detail
  shows all four tracks.
- **Incomplete data.** Common, because an imported back-book has gaps. A missing inverter
  make or battery size renders as an em dash, never as "unknown" and never as a zero. A
  missing email is not a gap in a field, it is a held row, and it belongs in the fix callout.

## IA / nav fit

Three destinations, no nesting, no back-stack except sheets and dialogs.

- **Customers** — the default, and where anyone lands.
- **Earnings** — the money, at company level.
- **Your list** — everything to do with the campaign: what was imported, what the email says,
  who confirmed permission, the newsletter link, and adding a household.

`Your list` is deliberately one destination rather than a settings area. A firm looks at it
twice — once to approve, once when they want to hand over another batch — and burying either
behind a gear icon would be hiding the two things the product needs from them.

## Design-guide impact

**No change to `design-guide.md`, deliberately.** Two reasons. That guide is the consumer
app's, and this is a different audience with opposite density needs. And the guide already
carries an unresolved naming split — it documents `--color-*` tokens while the app implements
`--lumo-*` — so adding a third namespace to it would compound a known problem.

The `--hub-*` tokens stay local to this repo. If the real build proceeds, promoting them to a
shared installer token set is a decision to take then, with the research behind it.

## Open questions

1. The darkened accent (`#12703A`). Legibility says derive a darker green; a stricter brand
   view might prefer the brand green as decoration only, with a neutral accent.
2. Whether the summary strip should show "need you" as a count or as money at stake. Money is
   more motivating and more honest about why the list matters; a count is less likely to be
   misread as an amount owed. Currently a count, with money on the callouts and rows.
3. Whether the campaign email should be editable, not just approvable. Editable is what a
   firm will ask for and it makes the copy untestable and the deliverability unpredictable.
   Currently read-only, with reply-to going to them — which may be enough of a concession.
4. Whether the held rows should be fixable inline in the table or in a dedicated flow. A
   dedicated flow tests better; inline is what someone with 41 of them would want.
5. Whether `no_response` should be visible in the default view at all. Showing it is honest
   and shows the campaign's true shape; hiding it makes the screen look better than the
   channel is. Currently shown under `All`, absent from `Needs you`.
