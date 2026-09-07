import { useParams } from 'react-router-dom';

/**
 * Where the personal link and QR land.
 *
 * It exists so that an installer who scans the code during a research session gets a
 * page instead of a 404. In the real product this is the consumer signup, carrying
 * the installer's token — which is exactly the producer that does not exist today:
 * attribution is currently a free-text `?partner=` string the customer can edit.
 *
 * Deliberately does NOT imitate the consumer signup. A convincing fake signup in a
 * prototype invites someone to type a real email address into something that cannot
 * receive one.
 */
export function JoinPage() {
  const { token } = useParams<{ token: string }>();

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-6 py-12">
      <span className="text-[17px] font-bold tracking-tight text-ink">
        Lumo <span className="text-accent">Hub</span>
      </span>

      <h1 className="mt-6 text-[24px] font-bold leading-tight text-ink">
        This link works. It just does not go anywhere yet.
      </h1>

      <p className="mt-3 text-[15px] text-ink-soft">
        In the real product this is where a household signs up to Lumo, with the credit for
        the referral already attached. This is a prototype, so it stops here rather than
        asking anyone for an email address it could never send to.
      </p>

      <div className="mt-6 rounded-card border border-line bg-surface p-4">
        <p className="text-[13px] font-semibold text-ink-soft">Installer credited</p>
        <p className="tnum mt-1 text-[16px] text-ink">{token}</p>
        <p className="mt-2 text-[13px] text-ink-mute">
          A person, not a company domain. That distinction is the whole point of the link.
        </p>
      </div>
    </main>
  );
}
