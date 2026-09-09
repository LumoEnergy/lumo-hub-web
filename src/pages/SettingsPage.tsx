import { useState } from 'react';
import { useDemoStore } from '../store/DemoStore';
import type { HubSeat } from '../fixtures';
import { Button, Card, Panel, ScreenTitle } from '../components/ui';

/**
 * Account settings, which in practice means the team.
 *
 * THE HUB IS A COMPANY ACCOUNT, and this is the screen that makes that claim
 * credible. Everything else on the site talks about "you" meaning the firm; without
 * somewhere to see who else is in, "you" is indistinguishable from a personal login,
 * which is the exact confusion the September review told us to kill.
 *
 * TWO ROLES ONLY. See `HubSeat`. The pay-out details deliberately are not here: the
 * money goes to the company and how it gets there is a finance conversation Lumo has
 * once, not a form in a prototype. A bank-details field on a demo is also the fastest
 * way to make a founder demo feel like it is asking for something.
 */
export function SettingsPage() {
  const { company, inviteSeat, removeSeat } = useDemoStore();

  return (
    <>
      <ScreenTitle sub={company.name}>Account</ScreenTitle>

      <div className="space-y-4 px-4 lg:px-0">
        <Panel title="Your team" meta={`${company.seats.length} people`}>
          <ul className="divide-y divide-line">
            {company.seats.map((seat) => (
              <SeatRow key={seat.id} seat={seat} onRemove={() => removeSeat(seat.id)} />
            ))}
          </ul>
          <Invite onInvite={inviteSeat} />
        </Panel>

        <Panel title="Company" meta="Who we pay">
          <dl className="space-y-2 text-[14px]">
            <Row label="Name" value={company.name} />
            <Row label="Reply-to address" value={company.sender.replyTo} />
            <Row
              label="Sending as"
              value={
                company.sender.rung === 'lumo_domain'
                  ? `${company.sender.displayName}, via Lumo's domain`
                  : `${company.sender.displayName}, from your own domain`
              }
            />
            <Row
              label="Permission on file"
              value={
                company.attestation
                  ? `${company.attestation.confirmedBy}, ${company.attestation.confirmedOn}`
                  : 'Not confirmed'
              }
            />
          </dl>
          <p className="mt-3 text-[13px] text-ink-mute">
            Rewards are paid to the company monthly. Bank details are set up with us once, off
            this screen.
          </p>
        </Panel>
      </div>
    </>
  );
}

const ROLE_LABEL: Record<HubSeat['role'], string> = {
  admin: 'Admin',
  viewer: 'Viewer',
};

const ROLE_HINT: Record<HubSeat['role'], string> = {
  admin: 'Can approve the email, hand over lists and invite people',
  viewer: 'Can see everything, change nothing',
};

function SeatRow({ seat, onRemove }: { seat: HubSeat; onRemove: () => void }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-ink">
          {seat.name}
          {seat.isCurrentUser ? (
            <span className="ml-2 text-[12px] font-semibold text-ink-mute">you</span>
          ) : null}
        </p>
        <p className="truncate text-[13px] text-ink-mute">{seat.email}</p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={[
            'rounded-chip px-2 py-0.5 text-[12px] font-semibold',
            seat.role === 'admin' ? 'bg-click-bg text-click-fg' : 'bg-wait-bg text-wait-fg',
          ].join(' ')}
          title={ROLE_HINT[seat.role]}
        >
          {ROLE_LABEL[seat.role]}
        </span>
        {seat.status === 'invited' ? (
          <span className="rounded-chip bg-warn-bg px-2 py-0.5 text-[12px] font-semibold text-warn-fg">
            Invite sent
          </span>
        ) : null}
        {seat.isCurrentUser ? null : (
          <Button variant="quiet" small onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
    </li>
  );
}

function Invite({
  onInvite,
}: {
  onInvite: (name: string, email: string, role: HubSeat['role']) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<HubSeat['role']>('viewer');

  const ready = name.trim() !== '' && email.includes('@');

  if (!open) {
    return (
      <div className="mt-4 border-t border-line pt-4">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Add someone
        </Button>
      </div>
    );
  }

  return (
    <Card className="mt-4 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[13px] font-semibold text-ink-soft">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 w-full rounded-chip border border-line-strong bg-surface px-3 text-[15px] text-ink"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-semibold text-ink-soft">Work email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-chip border border-line-strong bg-surface px-3 text-[15px] text-ink"
          />
        </label>
      </div>

      <fieldset className="mt-3">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink-soft">What they can do</legend>
        <div className="space-y-2">
          {(['viewer', 'admin'] as const).map((option) => (
            <label
              key={option}
              className={[
                'flex cursor-pointer items-start gap-2.5 rounded-card border p-2.5',
                role === option ? 'border-accent bg-accent-soft' : 'border-line',
              ].join(' ')}
            >
              <input
                type="radio"
                name="seat-role"
                checked={role === option}
                onChange={() => setRole(option)}
                className="mt-1"
              />
              <span>
                <span className="block text-[14px] font-semibold text-ink">
                  {ROLE_LABEL[option]}
                </span>
                <span className="block text-[13px] text-ink-soft">{ROLE_HINT[option]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          disabled={!ready}
          onClick={() => {
            onInvite(name, email, role);
            setName('');
            setEmail('');
            setRole('viewer');
            setOpen(false);
          }}
        >
          Send invite
        </Button>
        <Button variant="quiet" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>

      <p className="mt-2 text-[13px] text-ink-mute">Demo only. No invite is actually sent.</p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
      <dt className="text-[13px] font-semibold text-ink-soft">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}
