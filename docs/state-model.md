# Lumo Hub — state model and copy table

> **Generated from `src/state/` by `npm run state-table`. Do not edit by hand.**
> Edit the source and re-run. `npm run check` fails when this file is stale.

Four independent tracks. A household sits in one state on each at all times, and the
job of the UI is to make their combination legible. Every state carries the four
things the design has to produce: the plain-English label, what is actually blocking
it, whose job it is to fix, and the recommended action.

Ownership is the field that matters more than it looks. Without it installers chase
problems they cannot solve and stop trusting the list. "We could not control their
battery, we are investigating" is a Lumo problem. "Their inverter connection has
dropped" is a phone call they can make today.

Every blocker also carries its age. Three days is normal, six weeks is a dead
lead, and the UI must not present them identically.

## Invite

What happened to the invite. Hub-side only: no part of the platform emits any of this today.

| State | Label the installer sees | What is blocking it | Whose job | Recommended action |
|---|---|---|---|---|
| `added` | Added, not invited yet | You haven't chosen how they get invited. | You | Pick who makes contact: Lumo, or you. |
| `staged_for_lumo` | Lumo will contact them | Queued for Lumo to send. | Lumo | — |
| `sent_by_lumo` | Invited by Lumo | — | Nobody | — |
| `sent_by_installer` | You invited them | — | Nobody | — |
| `link_only` | Shared by link or QR | No email address captured, so nobody can chase them and matching depends entirely on them using your link. | You | Get their email if you can. Without it your £50 rests on the link alone. |
| `no_response` | No response | Invited, and they still haven't signed up. | You | Call them. A second email almost never lands. |
| `bounced` | Email bounced | The address didn't accept the invite, so they never saw it. | You | Check the address and re-add them with the correction. |
| `unsubscribed` | Unsubscribed | They opted out of Lumo email. We will not contact them again. | Nobody | — |

Permitted transitions:

- `added` -> `staged_for_lumo`, `sent_by_installer`, `link_only`
- `staged_for_lumo` -> `sent_by_lumo`
- `sent_by_lumo` -> `no_response`, `bounced`, `unsubscribed`
- `sent_by_installer` -> `no_response`, `unsubscribed`
- `link_only` -> `staged_for_lumo`, `sent_by_installer`
- `no_response` -> `staged_for_lumo`, `sent_by_installer`, `unsubscribed`
- `bounced` -> `staged_for_lumo`, `sent_by_installer`
- `unsubscribed` -> _terminal_

## Household activation

Where the household has got to on the Lumo platform. Ten of these eleven values are the enum the platform already emits; only no_account is ours.

| State | Label the installer sees | What is blocking it | Whose job | Recommended action |
|---|---|---|---|---|
| `no_account` | Hasn't signed up yet | They haven't created a Lumo account. | You | Chase the invite. A call converts far better than a second email. |
| `Not Linked` | Battery not connected | They have a Lumo account but haven't connected their inverter to it. | The household | Walk them through connecting the inverter in the app. This is the step people stall on. |
| `Linked, No Tariff` | No tariff set | Their battery is connected, but Lumo doesn't know their energy tariff, so it can't work out when charging is cheap. | The household | They need to pick their tariff in the app. A minute, if they have a recent bill. |
| `Setup Incomplete` | Not switched on yet | Connected and tariff set, but they have never turned Smart Control on, so it has never been tested. | The household | One toggle in the app. Worth a call — they are one tap from earning. |
| `Smart Control Test Running` | Lumo is testing control | Lumo is checking it can actually control the battery. | Nobody | — |
| `Smart Control Test Failed` | Lumo couldn't control the battery | Lumo sent commands and the battery didn't act on them. We're investigating. | Lumo | Nothing for you to do. Lumo will come back to you on this one. |
| `Smart Control Check Incomplete` | Lumo's check didn't finish | Lumo's control check couldn't be completed, so we can't confirm control either way yet. Nothing here says the system is broken. | Lumo | Nothing for you to do. Lumo is looking at why the check didn't finish. |
| `Smart Control Inactive` | Switched off by the household | Control was working, then they turned Smart Control off. | The household | Worth asking why. It is usually a worry about the battery being empty when they want it. |
| `Smart Control Active` | Earning | — | Nobody | — |
| `Needs Relink` | Connection dropped | Their inverter connection has expired and needs re-authorising. Lumo can't control the battery until it does. | The household | They need to reconnect in the app. Two taps, but nothing happens until they do it. |
| `Device Disconnected` | Battery offline | The battery or inverter isn't reachable. Usually power, home broadband, or a router that has been replaced. | You | This is the one on this list you can actually fix. Check it's powered and back on the home network. |

Permitted transitions:

- `no_account` -> `Not Linked`
- `Not Linked` -> `Linked, No Tariff`, `Needs Relink`, `Device Disconnected`
- `Linked, No Tariff` -> `Setup Incomplete`, `Not Linked`, `Needs Relink`, `Device Disconnected`
- `Setup Incomplete` -> `Smart Control Test Running`, `Needs Relink`, `Device Disconnected`
- `Smart Control Test Running` -> `Smart Control Active`, `Smart Control Test Failed`, `Smart Control Check Incomplete`, `Needs Relink`, `Device Disconnected`
- `Smart Control Test Failed` -> `Smart Control Test Running`, `Needs Relink`, `Device Disconnected`
- `Smart Control Check Incomplete` -> `Smart Control Test Running`, `Needs Relink`, `Device Disconnected`
- `Smart Control Inactive` -> `Smart Control Active`, `Needs Relink`, `Device Disconnected`
- `Smart Control Active` -> `Smart Control Inactive`, `Smart Control Test Failed`, `Needs Relink`, `Device Disconnected`
- `Needs Relink` -> `Smart Control Active`, `Smart Control Inactive`, `Not Linked`, `Device Disconnected`
- `Device Disconnected` -> `Smart Control Active`, `Smart Control Inactive`, `Not Linked`, `Needs Relink`

## Match

Whether the household who signed up can be tied to the installer who added them. No producer today.

| State | Label the installer sees | What is blocking it | Whose job | Recommended action |
|---|---|---|---|---|
| `matched_email` | Matched on email | — | Nobody | — |
| `matched_link` | Matched via your link | — | Nobody | — |
| `unmatched_different_email` | Signed up with a different email | They are on Lumo, but under an address you didn't give us, so nothing ties them to you. Your £50 is not counted while this is open. | You | Tell Lumo the address they actually used and we will tie it to you. Don't re-add them — that just creates a duplicate. |
| `ambiguous` | More than one possible match | More than one Lumo account could be this household, and we won't guess and risk crediting the wrong installer. | Lumo | Lumo will confirm which account is theirs. We may ask you for a postcode. |

Permitted transitions:

- `matched_email` -> _terminal_
- `matched_link` -> _terminal_
- `unmatched_different_email` -> `matched_email`, `matched_link`
- `ambiguous` -> `matched_email`, `matched_link`, `unmatched_different_email`

## Earnings

The installer's £50 per household, on 30 consecutive days of active control. Confirmed is final.

| State | Label the installer sees | What is blocking it | Whose job | Recommended action |
|---|---|---|---|---|
| `not_eligible` | Not earning yet | Smart Control has never been active. The 30-day clock starts the first time it is. | Their setup | Clear the blocker on their setup and the clock starts on its own. |
| `qualifying` | Qualifying | Smart Control has to stay active for 30 days in a row. | Nobody | — |
| `lapsed` | Clock reset | Control dropped before the 30 days were up, so the clock went back to zero. | Their setup | Fix the blocker on their setup. The 30 days restart from the day control comes back. |
| `confirmed` | Confirmed | — | Lumo | Yours. Lumo pays confirmed rewards in the next monthly run. |
| `paid` | Paid | — | Nobody | — |

Permitted transitions:

- `not_eligible` -> `qualifying`
- `qualifying` -> `confirmed`, `lapsed`
- `lapsed` -> `qualifying`
- `confirmed` -> `paid`
- `paid` -> _terminal_

## Platform precedence for activation

The order `compute_account_state()` decides in. Lower wins. `Device Disconnected` and
`Needs Relink` are evaluated before the underlying app-state derivation and therefore
shadow everything below them: a household can be mid-way through setup AND offline,
and the platform will report offline.

| Precedence | State | Counts toward the 30 days |
|---|---|---|
| 0 | `no_account` | No |
| 1 | `Device Disconnected` | No |
| 2 | `Needs Relink` | No |
| 3 | `Not Linked` | No |
| 4 | `Linked, No Tariff` | No |
| 5 | `Smart Control Test Running` | No |
| 6 | `Smart Control Test Failed` | No |
| 7 | `Smart Control Check Incomplete` | No |
| 8 | `Smart Control Inactive` | No |
| 8 | `Smart Control Active` | Yes |
| 9 | `Setup Incomplete` | No |

## Commercial rules

- **Qualification.** £50 per household, on 30 *consecutive* days in `Smart Control Active` measured
  from first activation. Any drop resets the clock to zero.
- **Clawback.** Confirmed is final. Once the days are served the reward is not reversed,
  even if control later drops. An installer cannot control a household unlinking six
  months after the job. This is encoded structurally: `confirmed` has no transition to
  `lapsed`.
- The amount is flat. The household-side grid reward is banded by battery size, and
  whether the installer fee should band with it is an open question, held as one constant.

## States with no producer today

A deliberate output, not a caveat. Designing these here means the real build knows up
front that it has to create them, rather than discovering it late and shipping a screen
that reports fiction.

### An invite that has a delivery state

- **Blocks the real build:** yes
- **States affected:** `added`, `staged_for_lumo`, `sent_by_lumo`, `sent_by_installer`, `link_only`, `no_response`, `bounced`, `unsubscribed`
- **Why it is missing:** Until now nothing tracked an invite. There is no invite entity, no send, and no delivery feedback anywhere in the estate.
- **What the real build must create:** An invite record with a real send, a real delivery/bounce/unsubscribe signal from the mail provider, and an age. The "Lumo will contact them" proposition is undeliverable without it.
- **Evidence:** The live Hub sets lumo_homeowner_email_invite_status = 'Email pending' on both add paths and nothing ever moves it. Its transactional email registry holds one template, admin-auth-alert, which is installer auth. Where real contacts read 'Email sent', a human typed it.

### A join between an invited email and a Lumo account

- **Blocks the real build:** yes
- **States affected:** `matched_email`, `matched_link`, `unmatched_different_email`, `ambiguous`, `no_account`
- **Why it is missing:** Nothing reconciles the address an installer typed against the address a household signed up with, so a mismatch is indistinguishable from a lead that never converted.
- **What the real build must create:** A matching step with an explicit unmatched outcome and a way to resolve it, plus an ambiguity outcome that refuses to guess. Silent non-matching is the failure mode that eats the reward.
- **Evidence:** There is no such join in lumo-api, Firestore or the Hub. The only signal that a household came from an installer is a free-text CRM property.

### An installer entity, and a per-person attribution link

- **Blocks the real build:** yes
- **States affected:** `matched_link`, `link_only`
- **Why it is missing:** There is no installer entity anywhere in the system of record. The only installer-to-household link in the whole estate is partnerTag: a ?partner= URL parameter, cached in the browser, validated server-side only as a string of 1 to 100 characters. lumo-api has no concept of an installer at all.
- **What the real build must create:** An installer entity in Postgres with real identifiers, a verified household association, and a token that identifies a person or a job rather than an email domain. The incentive only works if you can pay the individual who did the work, and attribution cannot be a string the customer can type.
- **Evidence:** Production partnerTag values include gbsolar.co.uk, GB_Solar_Ltd, not_sure and test_installer_01. The same firm is counted twice. The 2026-08-06 review named this as the blocker on the entire installer roadmap, independent of where the UI is built.
