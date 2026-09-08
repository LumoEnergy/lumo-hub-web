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

## Contact

What happened to the campaign email Lumo sends to the back-book, on the installer’s behalf. No producer today.

| State | Label the installer sees | What is blocking it | Whose job | Recommended action |
|---|---|---|---|---|
| `imported` | On your list | Loaded from your customer list. Lumo is still checking the details. | Lumo | — |
| `held_no_email` | No email address | Your list had no usable email for this household, so there is nobody for us to write to. Nothing else about the row is wrong. | You | Add the address if you have it anywhere. Each one you supply is another £50 on the table, and we cannot get it from anywhere but you. |
| `held_unconfirmed` | Battery not confirmed | We cannot tell from your list whether this household actually has a battery. Sending to solar-only customers wastes the send and risks spam complaints that damage everyone's campaign. | You | Confirm whether they have storage. You are the only one who knows, and a wrong guess either way costs you. |
| `awaiting_approval` | Ready to send | Cleaned, checked and ready. Waiting on you to approve the email we send on your behalf. | You | Approve the email once and every household on your list goes out. It is the only sign-off we will ask you for. |
| `queued` | Sending | In the send queue. We deliberately ramp up slowly rather than sending your whole list at once, because a spike of complaints would get every campaign filtered. | Lumo | — |
| `sent` | Email sent | — | Nobody | — |
| `opened` | Opened it | — | Nobody | — |
| `clicked` | Interested, not signed up | They clicked through and then stopped part-way. They are interested and something put them off. | You | The warmest leads on your list. A call from the firm that fitted their battery converts these far better than another email from a company they have never heard of. |
| `signed_up` | Signed up | — | Nobody | — |
| `bounced` | Email bounced | The address on your list is dead, so they never saw it. Common on a back-book — people change provider and move house. | You | A better address puts them straight back in the queue. Bounces also hurt our sending reputation, so this one helps the rest of your list too. |
| `no_response` | No response | Delivered a fortnight ago and never opened. A second email will not fix that. | You | Worth a call if they were a good customer. We will not chase these again — repeatedly mailing people who ignore us is how a sending domain dies. |
| `unsubscribed` | Opted out | They asked not to be contacted again, so we will not, and neither should you. | Nobody | — |
| `complained` | Marked as spam | They reported the email. Shown because it is honest and because it is the clearest signal that a list had addresses on it that should not have been there. | Nobody | — |

Permitted transitions:

- `imported` -> `held_no_email`, `held_unconfirmed`, `awaiting_approval`
- `held_no_email` -> `awaiting_approval`
- `held_unconfirmed` -> `awaiting_approval`, `held_no_email`
- `awaiting_approval` -> `queued`
- `queued` -> `sent`, `bounced`
- `sent` -> `opened`, `clicked`, `signed_up`, `bounced`, `no_response`, `unsubscribed`, `complained`
- `opened` -> `clicked`, `signed_up`, `no_response`, `unsubscribed`, `complained`
- `clicked` -> `signed_up`, `no_response`, `unsubscribed`
- `signed_up` -> _terminal_
- `bounced` -> `queued`, `held_no_email`
- `no_response` -> `signed_up`, `unsubscribed`
- `unsubscribed` -> _terminal_
- `complained` -> _terminal_

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

Whether the household who signed up can be tied to the firm who installed their battery. No producer today.

| State | Label the installer sees | What is blocking it | Whose job | Recommended action |
|---|---|---|---|---|
| `matched_import` | Tied to you | — | Nobody | — |
| `matched_manual` | Tied to you by hand | — | Nobody | — |
| `unmatched_different_email` | On Lumo, not credited to you | They are on Lumo and running, but they came in on their own rather than through your campaign, so nothing ties them to you. Your £50 is not counted while this is open. | You | Confirm this is your customer and we will tie it to you. Do not re-add them — that just creates a duplicate and delays it further. |
| `ambiguous` | More than one possible match | More than one Lumo account could be this household, and we will not guess and risk crediting the wrong firm. | Lumo | Lumo will confirm which account is theirs. We may come back to you for a postcode. |

Permitted transitions:

- `matched_import` -> _terminal_
- `matched_manual` -> _terminal_
- `unmatched_different_email` -> `matched_manual`
- `ambiguous` -> `matched_import`, `matched_manual`, `unmatched_different_email`

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

### A campaign send with real delivery feedback

- **Blocks the real build:** yes
- **States affected:** `queued`, `sent`, `opened`, `clicked`, `bounced`, `no_response`, `unsubscribed`, `complained`
- **Why it is missing:** Nothing tracks an outbound send to a household. There is no campaign entity, no send, and no delivery feedback anywhere in the estate.
- **What the real build must create:** A campaign with a per-household send record, plus a webhook consumer for the mail provider’s delivered, bounced, opened, clicked, unsubscribed and complained events. Without the bounce and complaint events specifically there is no way to protect the sending domain, and without click events there is no way to identify the warm leads that are the installer’s reason to engage at all.
- **Evidence:** The live Hub sets lumo_homeowner_email_invite_status = 'Email pending' on create and nothing ever moves it. Its transactional email registry holds one template, admin-auth-alert, which is installer auth. Where real contacts read 'Email sent', a human typed it.

### An import batch with data-quality outcomes

- **Blocks the real build:** yes
- **States affected:** `imported`, `held_no_email`, `held_unconfirmed`, `awaiting_approval`
- **Why it is missing:** There is no bulk ingestion path for installer-supplied households, and no concept of a row that was received but held back as unusable.
- **What the real build must create:** An import batch entity recording who supplied it, when, how many rows arrived, and a per-row outcome — loaded, held for a missing address, held pending a battery confirmation, or rejected as a duplicate. The held outcomes matter most: they are the only work the product asks an installer to do, so they have to be a real queryable state rather than a spreadsheet a human at Lumo keeps.
- **Evidence:** Nothing in lumo-api, Firestore or the Hub ingests a list. The first imports will be done by hand by Lumo staff, which is the right call for the first few installers and precisely why the resulting rows still need a real home.

### A join between a contacted household and a Lumo account

- **Blocks the real build:** yes
- **States affected:** `matched_import`, `matched_manual`, `unmatched_different_email`, `ambiguous`, `signed_up`, `no_account`
- **Why it is missing:** Nothing reconciles the household an installer supplied against the household that signed up, so a mismatch is indistinguishable from a lead that never converted.
- **What the real build must create:** A per-household token minted at import, carried through the campaign email and the signup flow, so attribution is a fact rather than an inference. Plus an explicit unmatched outcome with a way to resolve it, and an ambiguity outcome that refuses to guess. Silent non-matching is the failure mode that eats the reward.
- **Evidence:** There is no such join in lumo-api, Firestore or the Hub. The only signal that a household came from an installer is a free-text CRM property.

### An installer company account, with seats and an added-by audit field

- **Blocks the real build:** yes
- **States affected:** `matched_import`, `matched_manual`
- **Why it is missing:** There is no installer entity anywhere in the system of record. The only installer-to-household link in the whole estate is partnerTag: a ?partner= URL parameter, cached in the browser, validated server-side only as a string of 1 to 100 characters. lumo-api has no concept of an installer at all.
- **What the real build must create:** A company entity in Postgres with real identifiers, multiple user seats under it, a verified household association, and an added-by field on every household row. The money is owed to the company; the added-by field exists so the company can manage its own people. Attribution cannot be a string the customer can type.
- **Evidence:** Production partnerTag values include gbsolar.co.uk, GB_Solar_Ltd, not_sure and test_installer_01. The same firm is counted twice, which is what happens when identity is a free-text field rather than an entity.

### A recorded attestation that the back-book agreed to be contacted

- **Blocks the real build:** yes
- **States affected:** `awaiting_approval`, `queued`, `complained`
- **Why it is missing:** Nothing records permission to contact a household, because nothing has ever contacted one.
- **What the real build must create:** An attestation on the company account: who confirmed that their customers agreed to be contacted about products relating to their installation, when, and covering which import. It is the lawful basis for the whole campaign — Lumo sends as a processor on the installer’s instruction, relying on the installer’s own relationship with the household — so it needs to be an auditable record, not a checkbox whose value is discarded. It also protects the sending domain: a list without real permission generates the complaints that get every installer’s campaign filtered.
- **Evidence:** No consent or permission artefact exists in the estate for installer-sourced households. A data processing agreement per installer is the contractual half of this and is not a product feature, but nothing should send before both exist.

### Per-installer sender configuration

- **Blocks the real build:** no
- **States affected:** `awaiting_approval`, `queued`, `sent`
- **Why it is missing:** All outbound mail today is Lumo-branded transactional email from a single domain. There is no notion of sending on another party’s behalf.
- **What the real build must create:** A sender config per company: display name and reply-to at minimum, and optionally a verified sending subdomain the installer delegates by publishing DKIM and SPF records in their own DNS. The delegated form is authenticated and consented, which is what distinguishes it from spoofing — DMARC passes precisely because the domain owner published the key. Campaign mail must also leave from a domain entirely separate from the app’s transactional mail, so a bad list cannot take down password resets and control alerts with it.
- **Evidence:** The estate has one transactional sending identity and one template. Sending thousands of campaign emails from it would put every installer’s campaign and the app’s own mail behind the same reputation.
