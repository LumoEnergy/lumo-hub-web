import { useParams } from 'react-router-dom';

/**
 * Where the company newsletter link lands.
 *
 * It exists so that anyone following the link during a research session gets a page
 * instead of a 404. In the real product this is the consumer signup, carrying the
 * firm's token — which is exactly the producer that does not exist today: attribution
 * is currently a free-text `?partner=` string the customer can edit for themselves.
 *
 * Deliberately does NOT imitate the consumer signup. A convincing fake signup in a
 * prototype invites someone to type a real email address into something that cannot
 * receive one.
 */
export function JoinPage() {
  const { token } = useParams<{ token: string }>();

  return (
    <main className="mx-auto flex min-h-dvh max-w-[520px] flex-col justify-center px-6 py-12">
      <span className="text-[17px] font-bold tracking-tight text-ink">
        Lumo <span className="text-accent">Hub</span>
      </span>

      <h1 className="mt-6 text-[24px] font-bold leading-tight text-ink">
        This link works. It just does not go anywhere yet.
      </h1>

      <p className="mt-3 text-[15px] text-ink-soft">
        In the real product this is where a household signs up to Lumo, with the credit
        already attached to the firm who fitted their battery. This is a prototype, so it
        stops here rather than asking anyone for an email address it could never send to.
      </p>

      <div className="mt-6 rounded-card border border-line bg-surface p-4">
        <p className="text-[13px] font-semibold text-ink-soft">Credited to</p>
        <p className="tnum mt-1 text-[16px] text-ink">{token}</p>
        <p className="mt-2 text-[13px] text-ink-mute">
          A company, not a person. The firm is who Lumo owes the money to, and what they do
          with it internally is their business.
        </p>
      </div>
    </main>
  );
}
