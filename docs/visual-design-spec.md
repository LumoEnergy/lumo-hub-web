# Visual Design Spec, Lumo Hub (installer, desktop-first)

**Fidelity:** `rethink`
**Approved direction:** B, "Earnings-forward", with the pre-send guard below
**Status:** binding for this repo. Where this and
`lumo-engineering-context/cross-repo/design-guide.md` disagree, this wins, that guide is
scoped to the consumer app and says so.

## Problem lock

**User.** The person at a solar-and-storage firm who owns the customer relationship, an
owner-operator, an office manager, sometimes a sales lead. At a desk more often than not.
**A company, not an individual.** Lumo's customer is the firm; the firm decides internally
whether an engineer gets a cut of anything.

**Job to be done.** "What happened to the list I gave you, what has it earned me, and is
there anything only I can unblock?", answered in about ten seconds.

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
| Customers | Sortable data table, all rows | Card list |
| Chrome | Persistent left sidebar | Bottom tab bar |
| Density | 44px rows | 64px cards |
| Table columns | Every column in the view, container scrolls | Name, status, action |

**No column is ever hidden at a narrow width.** The first build dropped the age column
below 1280px, which took its heading with it and read as a broken table rather than as a
responsive one. Every column in a view is always rendered, the container scrolls
horizontally, and the household column is pinned so the name stays put while you scroll.

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

**Direction A, "Worklist".** A pure utility. White, near-black text, one accent, no
decoration. Compact table, no money hero, blockers only.
*Trade-off:* the better tool and the worse test. It looks like internal admin, it puts the
proposition nowhere, and it invites feedback about the table rather than about the offer.

**Direction B, "Earnings-forward".** The same table mechanics, but the money leads and
every blocker is attached to a number. Paid, confirmed and in-flight totals sit above the
list, and each held or blocked row says what it is worth.
*Trade-off:* leading with money on a screen showing nothing earned yet is exactly the
"growth fantasy shown to installers who have earned nothing" that the September product
review called out. Guarded below.

**Direction B is approved.** The reason is specific rather than aesthetic. The September
review's central finding was that Hub asked installers to do sustained work in exchange for
a return it could not show them. This rebuild removes almost all of the work; rendering the
return on every screen is what makes the remaining ask, one approval, and a short list of
missing email addresses, obviously worth doing.

**Pre-send guard.** Before a campaign has sent, no money is shown at all, not zero, not a
projection, not a "you could earn" estimate. The hero is replaced by the state of the list
and the one action outstanding. **No forecast appears anywhere in this product, in any
persona.** The `awaiting-approval` persona exists to test that this holds.

## Layout

### Desktop

```
+----------------+--------------------------------------------------+
| Northfield     |  Dashboard                                       |
| Renewables     |  +--- Earned by Northfield ----------------+     |
| Ade Bankole    |  |  £1,000    £700 paid  £300 next run     |     |
| . Account      |  +-----------------------------------------+     |
|                |                                                  |
| Dashboard      |  +--- Where your customers are ---+ +---------+  |
| Customers      |  | On your list  [====== 808 ]    | | Sending |  |
| Campaign       |  |     Emailed   [=== 486 ] 60%   | +---------+  |
|                |  |      Opened   [ 91 ]     19%   | | Live    |  |
|                |  |   Signed up   [ 39 ]     43%   | | Waiting |  |
| Reset demo     |  |     Earning   [ 38 ]     97%   | +---------+  |
+----------------+--------------------------------------------------+
  240px fixed        max 1200px, 32px gutter
```

1. **Sidebar**, 240px, fixed, full height. Company name and current seat at the top, the
   company name is the largest text in it, because the account is the firm. **The identity
   block is the link to account settings**, which is where people look for it; a fourth main
   nav item would put team admin at the same weight as the campaign. Three nav items. A quiet
   reset at the bottom.
2. **Main**, scrolling, 1200px maximum, 32px gutter. Page title with a total count, then the
   content.

### Mobile

1. **App bar**, 52px. Company name left, current seat and a gear icon right, linking to
   account settings. No share icon, there is no personal link in this product.
2. **Content**, scrolling, 16px gutter.
3. **Bottom tab bar**, 56px plus safe-area inset. Dashboard, Customers, Campaign.

### Per screen

Three tabs plus account settings. The previous four opened the app on an owner-grouped
attention queue and had **two** tabs that were both lists of the same households, one for
progress, one for money. The reader had to hold both in their head and reconcile them, and
the first screen anyone saw described admin rather than a campaign.

- **Dashboard.** Money hero (or the approval callout, before anything has sent) then **four
  panels in a 2x2**: the funnel with its drop-outs, live customers, sending, what needs you.
  Grid fills across before down, so that is also the reading order. Live customers sits on
  the funnel's eyeline because it is the proof that Lumo keeps working after signup, which
  is the thing an installer doubts; sending is mechanism and drops to the second row.
  Answers *is this working?*

  **It was one panel beside a stack of three, and that is the version to avoid.** The stack
  ran about two panels taller than the funnel, so the screen was visibly bottom-right
  weighted with a column of dead space under the drop-outs. Balance here is not decoration:
  an unbalanced two-column layout reads as an unfinished screen, and this is the first thing
  a founder sees.
- **Customers.** Four views over one list (below), each with its own columns. No callouts.
  Answers *who, and how much?*
- **Campaign.** File records with what became of every row → the email, editable, and its one
  sign-off → the send schedule and its daily rate → email campaign setup → permission → the
  newsletter link → add a household. Answers *what goes out, when, from whom?*
- **Account.** The team, their roles, and the company facts. Answers *who else can get in?*

### The first-open guide

Five steps in a modal on first load: welcome and the reward, send us your list, we load it and
check with you, watch it land, then it keeps working. Dot index, click through, escape or skip
to dismiss, and a quiet `How this works` link in the sidebar to reopen it.

**It fires once per page load, not once per navigation.** That is the requirement and it is
why the state lives in the shell rather than on the dashboard: the shell mounts once and the
pages come and go underneath it, so changing tab leaves it closed and a hard refresh reopens
it. Moving that state onto a page component would break the timing while leaving every screen
looking correct, so it is asserted in a test.

**Not persisted.** No localStorage, no "do not show again". Every other piece of state here is
in memory and resettable, and a demo that hides its own opening on the second run is a demo
that cannot be shown twice. `?guide=off` suppresses it for screenshots and for the deploy
smoke check, which otherwise reads the overlay instead of the page.

**Wireframes, not screenshots.** Each step that points at a place in the app draws a schematic
of the chrome with one panel ringed in accent. A screenshot would be sharper and wrong twice
over: it goes stale the next time a panel moves, and it presents fixture data as an example of
the product.

**The reward is stated per household and never as a total**, and the wording is "signs up and
stays connected for 30 days", not "added". Adding a customer earns nothing on its own. "Each
customer you add earns you £50" is the same overclaim as the £1,400 banner on the forbidden
list, one household at a time.

**Renamed from "Your list"**, which read as a page about people while a sibling tab
genuinely was the list of people.

### The four views of the customer list

Four, because these are four questions a firm arrives with, not one list filtered four
ways. **Each view gets its own columns**, and that is the change that makes the screen
usable: a campaign row wants a status and a date, a live household wants its kit, its
control health and its reward clock. One column set covering both leaves every row with
four empty cells.

| View | Question | Columns |
|---|---|---|
| Invited (default) | What did the ones we emailed do? | Household, Status, Emailed, Reward |
| Not yet contacted | When does the rest go out? | Household, Status, Scheduled send |
| Needs you | What can only I do? | Household, Status, Waiting, What to do |
| Active | How are my live customers? | Household, Battery, Inverter, Control, Live for, Reward |

**There is no All, and the screen opens on Invited.** An 808-row undifferentiated list is
the least useful thing this screen can show: it is the whole book averaged into one scroll,
sorted so that the 322 households nothing has happened to yet were the first thing anybody
saw. Invited is where the campaign actually is.

**Removing it moved an invariant out of the UI.** All was the one view guaranteed to contain
everybody, so reachability now depends on `EMAILED_STATES` and `WAITING_STATES` partitioning
all thirteen contact states with no overlap and no gap. That is asserted in a test, because
a fourteenth state added and not filed would silently strand households in a view nobody can
open, and nothing on screen would look wrong.

**The screen title still counts the whole book**, 808, and the two campaign tabs sum to it.
That is the one place the total belongs: it is what the firm handed over, the subtitle says
so, and no tab claims the same number.

**Needs you is exactly four jobs, plus the money going nowhere.** No email address, a
bounce, an unconfirmed battery, and a click that has gone cold after seven days. Plus
unmatched, which is not a campaign state at all. It is deliberately a named list rather
than "everything with a blocker": deriving it from state dispositions quietly swept in
activation problems a firm can do nothing about, and a to-do list is only a to-do list if
everything on it is doable.

**Active is "live on Lumo", not "earning".** A monitoring view that hides the disconnected
households is a monitoring view nobody can use.

**The default sort runs backwards down the funnel**, live first. That is a change of mind:
it used to put the firm's chores at the top, which is right for a queue and wrong for a
default view, because opening on twenty-six identical "No email address" rows makes a
working campaign look like a mess. The chores have their own tab now.

### Status is one thing

**The status column reports where a household has got to, and nothing else.** It used to
show whichever of four tracks was most blocking, which is why it could say "More than one
possible match" or "Interested, not signed up". Both are accurate and neither is a thing
anybody says, and a column that sometimes reports campaign progress and sometimes reports an
internal matching problem is not one column, it is two sharing a header.

Not emailed yet → Emailed → Email opened → Clicked through → Signed up → Active, plus the
dead ends: bounced, no response, unsubscribed, marked as spam, and the two held states.

Problems moved out, they did not disappear. Anything the firm can act on is an instruction
in the `What to do` column on Needs you, phrased as an imperative rather than a diagnosis.
That is the honest split: **a status is a fact about the customer, an action is a job for
the firm.**

### The funnel

Five stages, narrowing: on your list → emailed → opened → signed up → earning. Hand-rolled
CSS bars, **left-aligned**. No charting library in a disposable prototype.

**Centred bars were tried and reverted.** The argument for them was that a symmetrical taper
is the shape everybody recognises from a funnel diagram, so it would be understood before it
was read. In practice it cost more than it bought: with a shared left edge the eye compares
five bar ends against one datum, and centring replaces that with two moving edges and no
datum. The narrow stages at the bottom, which are the ones carrying the interesting numbers,
became the hardest to compare. A recognisable silhouette is worth less than a readable
comparison.

- **Five stages, not six.** A Delivered stage sat between Emailed and Opened whose only
  content was the bounce count. A sixth bar earned less than the second it cost to read, and
  bounces are accounted for underneath instead.
- **Bar width is share of the list. The percentage is share of the stage above.** Two
  different questions, and conflating them is how funnels mislead, a bar drawn to the
  conversion rate makes a 9% bounce look like a cliff, and one drawn to share of list hides
  where the loss happened.
- **No floor width beyond a visible sliver, and the count moves outside the bar when it
  will not fit.** A 14% floor was the first attempt and it clamped opened, signed up and
  earning to the same width, because all three are under 12% of Northfield's book. Three
  different numbers, three identical bars, in the half of the funnel a founder is reading.
- **A stage at zero gets no bar at all** and says "none yet". The floor applied to an empty
  stage drew a green block beside "Earning 0".
- **No prose.** Each stage carried an explanatory sentence, which is five sentences of body
  text on a screen whose entire job is to be glanced at. A label, a count and a drop-off
  percentage is what a funnel is. The sentence survives as a `title` for anyone who hovers.
- **Everything the funnel drops is accounted for underneath**: still to send, bounced, no
  address, no response, opted out. "808 on the list, 486 emailed" otherwise invites the
  assumption that the product lost the other 322. The two a firm can fix are the two that
  carry colour.

## Hierarchy and typography

Figtree, already loaded. Weights 400/500/600/700 only.

- **Money hero** 40px / 1.0 / 700, tabular numerals. The only display-scale type in the app.
- **Screen title** 28px desktop, 24px mobile / 1.2 / 700.
- **Section heading** 13px / 1.2 / 600, sentence case, secondary colour. Deliberately *not*
  uppercase with letter-spacing, that pattern is in the consumer guide and it measurably
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
--hub-page          #F7F7F5   app background
--hub-surface       #FFFFFF   cards, rows, table
--hub-surface-sunk  #F1F1EE   nested, input backgrounds, table header
--hub-line          #E6E5E1   hairline borders and dividers
--hub-line-strong   #D1D0CA   input borders, focus outline base

--hub-text          #14140F   primary
--hub-text-soft     #5F6058   secondary
--hub-text-mute     #8C8D84   meta

--hub-accent        #12703A   Lumo green, darkened for legibility on white
--hub-accent-soft   #E8F7EA   accent background
--hub-accent-bright #7DE370   the consumer brand green, fills only, never text
```

**The neutrals are warm, and that is the whole of the "it feels cold" fix.** They were blue
greys (`#F6F7F8`, `#5B6469`), which is the default of every admin tool and reads as
institutional. Shifting the hue a few degrees warm across the page, the sunk surface, the
lines and the three text tones changes the temperature of every screen without adding a
single decorative element. Colour was the wrong lever, hue was the right one.

**On the green.** `#7DE370` is a dark-UI green: on white it fails contrast for text at any
size. Rather than abandon the brand tie or ship unreadable text, the accent is a darkened
sibling of the same hue for anything with a glyph in it, and the original is retained for
fills where contrast is irrelevant. This is the one deviation most worth challenging, and
the alternative, a mid-grey accent with green used only decoratively, is a legitimate
answer if the brand view is stricter than mine.

### The journey palette

The screens were grey with one green accent, which is legible and lifeless, and worse than
that it wasted the only channel that can carry meaning in a table of 800 rows. So a second
small palette exists, and **every colour in it means a position in the funnel.**

```
--hub-wait   #5A6470 on #EEF1F4   queued, nothing has happened yet
--hub-sent   #1D4ED8 on #E8EEFE   emailed, delivered
--hub-open   #0F766E on #E0F2F1   opened, engaged
--hub-click  #15803D on #E7F6EA   clicked through, signed up, live
--hub-warn   #9A4B0C on #FCEBDD   needs the firm
```

Blue → teal → green is a progression the eye reads as movement without a legend, which is
what makes the funnel and the status chips comprehensible at a glance. Five hues is the cap.

**Green never appears on a blocker.** An actionable problem is not a good thing, and
colouring it green teaches installers to skim past it. `--hub-warn` is the only colour a
problem gets, and it is the same one on the funnel drop-outs, the status chips and the Needs
you actions, so the reader learns it once.

### Age

**Age drives colour. One dimension per channel.** A two-dimensional system where hue means
"whose job" and intensity means "how old" is unreadable at a glance, which defeats the point.

```
fresh   (0-6 days)    neutral   text-soft on surface
ageing  (7-20 days)   amber     #B4690E on #FDF3E3
stale   (21-41 days)  orange    #9A4B0C on #FCEBDD
dead    (42+ days)    red       #B3261E on #FDECEA
```

**A campaign-specific corollary.** The silent majority of any back-book campaign never
responds, and those rows must read as neutral fact rather than as failure. `no_response` at
26 days would otherwise paint a third of the table orange, which is both demoralising and
wrong: nobody did anything incorrectly. Age banding therefore applies only to rows the firm
or the household can act on. States owned by nobody, no response after we have stopped
chasing, unsubscribed, marked as spam, render neutral at any age.

## Components

**Reuse:** nothing. This is a new repo with no component library, by decision, the surface
is four screens and hand-rolled components avoid pulling a dependency into what is meant to
be a disposable shell around two durable modules.

**New:**

- `Sidebar`, `AppBar`, `TabBar`, the shell, responsive between the first and the last two.
- `MoneyHero`, paid, confirmed, in flight. Suppressed entirely before a send.
- `CustomerTable`, desktop. Sortable headers, 44px rows, per-view columns, pinned first
  column, horizontal scroll, whole row opens the detail.
- `CustomerCard`, mobile.
- `EmailPreview` + `EmailEditor`, the campaign email rendered as it arrives, including the
  From line, and a sheet for editing the subject and body.
- `SenderLadder`, two cards, with the DNS steps behind the second one.
- `FileRecords`, supplied, loaded, held, rejected, with the reason.
- `StatusChip`, `AgeChip`. **No owner chip**, see the forbidden list.
- `Sheet`, bottom sheet on mobile, centred dialog on desktop. One implementation, and it
  carries the DNS instructions, the email editor and the row detail.
- `SegmentedToggle`, the four views. Toggle buttons with `aria-pressed`, **not**
  `role="tablist"`: tabs promise a panel each, and these press in and out over one list that
  stays put.
- `Funnel`, `DropOuts`, `FleetStrip`, `SendSchedule`.
- `Button` (primary, secondary, quiet), `Field`, `PasteGrid`, `CopyBlock`.
- `EmptyState`, `ResetPill`.

### Live customers, without inventing energy data

Active households need to look monitored, or the product reads as a lead generator that
stops caring the moment someone signs up. But this build has no route to energy data and
must not draw a chart of it (see the forbidden list). `FleetStrip` is what is left when you
take that seriously: **three facts that are true of the fixtures**, control running versus
not, how far through the 30-day reward clock the cohort is, and the inverter mix. No
kilowatt-hours, no state of charge, no savings.

The bet is that a firm reading "36 of 38 optimising" believes Lumo is watching, and would
not believe a fabricated energy chart for long.

**Explicitly forbidden:**

- Dark surfaces, radii above 16px, uppercase letter-spaced labels.
- Green on any blocker.
- **Any personal link, personal QR code, or per-person attribution.** The account is the
  company. A company link exists for the firm's own newsletter and lives on `Your list`,
  framed as content to paste into a channel they already own, not as a way to add someone.
- A map. The live Hub has one; it is decoration that consumed a geocoder and a personal-data
  path for no decision an installer makes.
- Any chart, any energy time series, any state-of-charge or savings figure. Hub has no route
  to energy data and this build has no backend at all. Showing any of it, even as fixture
  data, would set an expectation the real build cannot meet on the timeline being tested.
- Any revenue projection or "you could earn" estimate, on any screen, in any persona.
- Any control that asks the firm to record something they did outside the product.
- **A count multiplied by £50, where the money depends on those households converting.**
  This one is subtle enough to have shipped once. "28 missing an email address, that is
  £1,400 we cannot go after" reads like a fact and prices the fix at 100% conversion, on a
  channel where a realistic back-book return is a fraction of that. Quote the rate per
  household instead: it is true, and it still makes the argument. A total is only allowed
  where the money is already earned: the dashboard money hero and the unmatched note on
  `Needs you`, where the households exist, the 30 days are served and the sum is real.
- **An em dash, anywhere, in any copy, comment, doc or generated file.** There is a test.
  Where a table cell has no value it says "not given" in muted italic, not a dash, because a
  dash is indistinguishable from a rendering failure. The state-model generator uses an en
  dash for genuinely empty cells.
- **A projection of what the firm will earn**, on any screen, in any persona: "you could
  earn", "on track for", "projected". **The household's guaranteed grid reward is not one of
  these** and leads the campaign email. £150 a year is a commitment Lumo makes, not an
  outcome Lumo predicts, and the distinction is worth holding precisely because the phrasing
  looks similar. The copy test encodes exactly this line.
- **A status that reports an internal disposition.** "More than one possible match", "On
  Lumo, not credited to you", "Interested, not signed up". See "Status is one thing".
- **The same label over two different numbers.** "Need you 75" above a "Needs you 21" filter
  is two correct numbers and one broken screen. If a figure summarises the workload and a
  control filters it, they either agree or they are named differently enough that nobody has
  to work out why they do not. **Where a figure links to a filtered list, both must come from
  the same predicate**, `needsYouIndividually` exists because the dashboard count and the
  filter each computed their own answer and disagreed by 118.
- **An owner column.** It read "Whose" and showed "You" / "The household" / "Lumo", which is
  a concept from the state model rather than a fact about a customer; the first person to see
  it asked what it meant. Ownership still decides what the `Needs you` filter contains and
  what the detail panel asks for. It is not a thing to read in a row.
- **A date on a batch that cannot send yet.** Nothing goes out before sign-off, so an
  unapproved schedule shows "day 1, day 2, day 3". A date that slips because someone took a
  day to read the email is a broken promise the product made to itself.

## Callouts: none on Customers

`Customers` had two banners above the table. Both are gone, and the reasoning is worth
keeping because it will be proposed again.

**Unmatched** got a full-width callout naming the households and the money already earned
that is going to nobody. It was honest and it was the one place a multiplied total is
allowed. It still shouted about £100 on every visit to a screen whose job is to be read, and
the thing it wanted was one confirmation on three rows. It is now three rows in `Needs you`,
with the total stated once, in that view, where someone has arrived to do exactly this.

**Data quality**, `held_no_email`, `held_unconfirmed`, `bounced`, was a second banner of the
same kind, stated in aggregate *with a total*: "28 households are missing an email address.
That is £1,400 we cannot go after." Both halves were wrong. The total prices the fix at 100%
conversion (see the forbidden list), and the aggregate framing came from believing the
household was not the unit of work. It is: every one of those rows needs a *different*
address, and only the firm has it.

**The distinction that survives is per-list versus per-household.** One sign-off releasing
118 households is per-list, so it appears once, on the dashboard and the campaign screen,
and never as a row. Everything that needs the firm household by household is a row in
`Needs you` with an instruction beside it. `clicked` is twelve specific humans somebody
would ring, and a name is what makes that call possible.

What is left above a table is nothing. The view's own description, one line, does the work
both banners were doing.

## Interaction

**The one-approval path.** `Campaign` → read what became of the file → read the email exactly
as it will arrive → change anything → approve. One button, one confirmation naming how many
households will be contacted and over what period. Nothing is hidden behind "we'll take it
from here".

**The email is editable, which reverses an earlier decision.** It was read-only on the
grounds that editable copy is untestable and unpredictable for deliverability, with reply-to
as the concession. That was the wrong trade for this audience: a firm being asked to let
Lumo write to its own customers, under its own name, will not accept "you can read it".
Refusing the edit protects a copy test nobody has run yet and loses the sign-off, which is
the only thing the product actually needs. Subject and body are editable, the CTA and the
footer are not.

**The email leads on the guaranteed grid reward**, set in accent green at 18px, above
everything else in the message: "Lumo will earn you a guaranteed £150 per year for helping
the grid." Every other version of this email led on the technology. The reward is the only
sentence in it a household would act on, and the CTA says `Get Lumo now`.

**The send schedule is a deliverability mechanism presented as a feature.** Several hundred
emails leaving a young sending domain at once is the fastest way to get every later campaign
filtered, for this firm and, on the shared rung, for every firm on the domain. So the
throttle is stated rather than hidden, with the reason attached, and the daily rate is
editable between 10 and 500. Said out loud it converts "why is this taking a fortnight" into
"good, they know what they are doing".

**Uploading another list does not become the only route.** The upload sits next to
`partners@lumo.energy`, equally prominent, and asks for no column mapping, no header matching
and no preview grid. Lumo doing that work *is* the promise; an upload screen that makes a firm
tidy their own CSV breaks it while looking like a feature. A new file lands as `processing`
with no outcome counts, because that is what actually happens.

**The sender ladder, as a named research probe.** Under the heading `Email campaign setup`,
two cards, side by side, equal weight:

- *Send from Lumo's domain*, nothing to set up. The firm's display name and reply-to, so it
  arrives as them, with a small "via" note in some clients.
- *Send from your own domain*, two DNS records. The firm delegates a subdomain by publishing
  a DKIM key. Authenticates as them and insulates their main domain's reputation.

Two cards, not three: a third card explaining what the DNS change involves sat below them
permanently, so the page carried the cost of the harder option whether or not anyone was
considering it. **The records now live in a modal opened by the second card**, which is where
someone who has chosen it will look, and it offers a call rather than assuming the reader
runs their own DNS. Most installers do not, and pretending otherwise is how this rung gets
declined for the wrong reason.

This is presented as a choice with its cost stated, because which rung installers will
actually accept is unknown and is one of the things the five sessions are for. It must not be
presented as a recommendation.

## Copy

**Shorter, and human. Default to less.** Six paragraphs of reasoning under a panel heading
is a designer arguing with the reader. The rule now: one line of explanation where a
non-obvious mechanism needs it, none where it does not, and the reasoning lives in this
document and in code comments instead.

- No em dash, ever. See the forbidden list.
- No ellipsis character. `...` if it is genuinely needed.
- Sentence case everywhere, including buttons.
- Say what the reader does, not what the system does: "Give us an address and Priya joins
  the send queue", not "As soon as you supply an address the household will be enqueued".
- Never explain the same mechanism twice on one screen.

**Secondary actions.** Click or tap a row for the detail: the four track states, the age, the
money position, who supplied the row and on which import. Add a household is a secondary
panel on `Campaign`, with the paste grid as the default form rather than a single-record
form, a firm adding one household by hand is the rare case now.

**Row capping.** The table renders 150 rows and says "Showing 150 of 808" with a `Show more`.
An 800-household book is realistic; 800 table rows makes the demo machine sluggish for a list
nobody scrolls to the end of. It states the cap rather than truncating quietly.

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
- **Empty (filtered).** A message specific to the view, "Nothing needs you", "Nobody is live
  yet", "Everyone has been emailed", with a quiet route to the full list. Each is a good
  outcome and should read as one. A single generic empty state here would claim nothing needs
  the firm on a screen filtered to something else entirely.
- **Processing.** A handed-over file with a row count and no outcome figures, saying so. Real
  loading is asynchronous; a screen that implies otherwise turns a normal wait into a support
  ticket, and a fabricated count into a fact somebody trusts.
- **Error.** Not reachable, there is no network call in the app. The router renders a plain
  not-found for any path outside the demo base.
- **Partial.** The normal case, and the whole point: a household can be emailed, signed up,
  unmatched and not earning simultaneously, and the row has to say so without four badges.
  Resolution: the row shows the single most blocking state by precedence, and the detail
  shows all four tracks.
- **Incomplete data.** Common, because an imported back-book has gaps. A missing inverter
  make or battery size renders as "not given" in muted italic, never as a dash, never as
  "unknown" and never as a zero. A missing email is not a gap in a field, it is a held row,
  and it belongs in `Needs you`.

## IA / nav fit

Three destinations plus an account area, no nesting, no back-stack except sheets and dialogs.

- **Dashboard**, the default, and where anyone lands. Is this working?
- **Customers**, one list, four views, status and money together. Who, and how much?
- **Campaign**, the files, the email, the schedule, the sender, the permission, and adding a
  household. What goes out, when, from whom?
- **Account**, off the identity block rather than the main nav. The team and their roles.

**Retired, with redirects.** `earnings` → `customers?view=active`, `list` → `campaign`,
`add` → `campaign`. An old link lands where the content went rather than on a 404. The view
is a URL parameter so a founder demo can be deep-linked straight to `Needs you`.

`Campaign` is deliberately one destination rather than a settings area. A firm looks at it
twice, once to approve, once when they want to hand over another batch, and burying either
behind a gear icon would be hiding the two things the product needs from them.

**Two roles, Admin and Viewer, and no permission model behind them.** An office manager
needs to see the list without being able to approve a send to eight hundred customers, which
is one boundary, and one boundary needs two roles. Anything finer is a permission matrix
nobody has asked for. The demo shows the roles and an invited-but-not-accepted seat, because
"can I get my team in?" is the second question every firm asks and an empty settings page
answers it badly. **No bank details anywhere**, that conversation happens off-platform and
putting a form for it here would invite a question the prototype cannot answer.

**The dashboard is not a fourth list.** It links into `Customers` three times, from the
money hero, from the attention panel, and implicitly from the funnel, and lists nothing
itself. The moment it starts showing households it has become the screen it replaced.

## Design-guide impact

**No change to `design-guide.md`, deliberately.** Two reasons. That guide is the consumer
app's, and this is a different audience with opposite density needs. And the guide already
carries an unresolved naming split, it documents `--color-*` tokens while the app implements
`--lumo-*`, so adding a third namespace to it would compound a known problem.

The `--hub-*` tokens stay local to this repo. If the real build proceeds, promoting them to a
shared installer token set is a decision to take then, with the research behind it.

## Open questions

1. The darkened accent (`#12703A`). Legibility says derive a darker green; a stricter brand
   view might prefer the brand green as decoration only, with a neutral accent.
2. Whether the held rows should be fixable inline in the table or in a dedicated flow. A
   dedicated flow tests better; inline is what someone with 41 of them would want.
3. Whether `no_response` should dominate the default view. It is 320 of Northfield's 486
   invited households, so `Invited` is mostly silence, which is the honest shape of the
   channel and also the least encouraging thing to open on. Currently shown.
4. Whether the seven-day stale-click threshold is right. It decides the size of the only
   list in the product that asks a firm to pick up the phone: too short and it fills with
   people still deciding, too long and the lead is cold before it appears.
5. Whether the whole-book total belongs in the screen title now that no tab shows it. It is
   what the firm handed over and the two campaign tabs sum to it, but a reader who only
   looks at the tabs never sees 808 anywhere except the funnel.

**Resolved since the last revision.** The campaign email is editable. The "need you"
summary is a count rather than money at stake, and comes from the same predicate as the
view it links to. `All` is gone, which also settles whether `Invited` and `Not yet
contacted` earn separate tabs: they are now the only two campaign views, so they must.
