import { useState } from 'react';
import { REWARD_GBP } from '../state';
import { displayName } from '../fixtures';
import { useDemoStore } from '../store/DemoStore';
import type { CustomerRow } from '../selectors/customers';
import { Button, Field } from './ui';

/**
 * The only editable surfaces in the product.
 *
 * Everything else the Hub shows is read-only, deliberately: the premise is that Lumo
 * does the work and the firm reads the result. These three inputs exist because they
 * are the only facts Lumo genuinely cannot obtain any other way — an email address
 * that was never in the export, whether a household actually has storage, and whether
 * an uncredited Lumo account is theirs.
 *
 * Each one states what it is worth before it asks for anything. A firm that has not
 * yet been paid has no reason to do admin for a company they have just met.
 */

export function HeldRowFixer({
  row,
  onDone,
}: {
  row: CustomerRow;
  onDone: () => void;
}) {
  const { supplyEmail, confirmBattery } = useDemoStore();
  const [email, setEmail] = useState('');
  const needsEmail = row.customer.contact === 'held_no_email';

  if (needsEmail) {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    return (
      <form
        className="mb-4 rounded-card border border-line bg-sunk p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          supplyEmail(row.customer.id, email);
          onDone();
        }}
      >
        <p className="text-[15px] font-semibold text-ink">
          Add their address and we will do the rest
        </p>
        <p className="mt-1 text-[14px] text-ink-soft">
          Worth £{REWARD_GBP}. As soon as you give us an address, {row.customer.firstName}{' '}
          joins the send queue — you do not need to write anything or tell us you have.
        </p>
        <div className="mt-3">
          <Field
            label="Email address"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mt-3">
          <Button type="submit" disabled={!valid}>
            Add and queue
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="mb-4 rounded-card border border-line bg-sunk p-3">
      <p className="text-[15px] font-semibold text-ink">
        Does {row.customer.firstName} have a battery?
      </p>
      <p className="mt-1 text-[14px] text-ink-soft">
        Your list did not say. Worth £{REWARD_GBP} if they do. If they only have solar,
        telling us now keeps them out of the send — solar-only customers generate the spam
        complaints that slow everyone else down.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            confirmBattery(row.customer.id, true);
            onDone();
          }}
        >
          Yes, they have storage
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            confirmBattery(row.customer.id, false);
            onDone();
          }}
        >
          No, solar only
        </Button>
      </div>
    </div>
  );
}

export function UnmatchedFixer({ row, onDone }: { row: CustomerRow; onDone: () => void }) {
  const { claimHousehold } = useDemoStore();

  return (
    <div className="mb-4 rounded-card border border-dead-fg/25 bg-dead-bg p-3">
      <p className="text-[15px] font-semibold text-dead-fg">
        £{REWARD_GBP} is not being credited to you
      </p>
      <p className="mt-1 text-[14px] text-dead-fg/90">
        {displayName(row.customer)} is on Lumo with control running, but they signed up on
        their own rather than through your campaign. Confirm they are your customer and we
        will tie the account to you. Do not re-add them — that makes a duplicate and delays
        it further.
      </p>
      <div className="mt-3">
        <Button
          onClick={() => {
            claimHousehold(row.customer.id);
            onDone();
          }}
        >
          They are my customer
        </Button>
      </div>
    </div>
  );
}
