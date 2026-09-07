import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CopyBlock } from './ui';

/**
 * The installer's personal link and QR.
 *
 * Personal to the individual, never the company domain. This is the one thing in the
 * product that costs an installer no ongoing effort, and the incentive only works if
 * you can pay the person who did the work — today's attribution records an email
 * domain, so one firm shows up as several installers and four staff at one company
 * would all share a single link.
 *
 * The QR encodes the same URL it displays, and that URL is this demo's own landing
 * route rather than an aspirational lumoenergy.co.uk address. A prettier link that
 * dies when an installer actually scans it in a research session is worse than a
 * visibly-a-prototype link that works.
 */
export function personalLink(linkToken: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${window.location.origin}${base}/join/${linkToken}`;
}

export function QrCode({ value, size = 176 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0E1113', light: '#FFFFFF' },
    })
      .then((url) => {
        if (live) setDataUrl(url);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [value, size]);

  if (failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="grid place-items-center rounded-chip border border-line bg-sunk px-3 text-center text-[13px] text-ink-mute"
      >
        Use the link below
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="grid place-items-center rounded-chip border-2 border-accent-bright bg-white p-2"
    >
      {dataUrl ? (
        <img src={dataUrl} alt={`QR code for ${value}`} width={size - 20} height={size - 20} />
      ) : null}
    </div>
  );
}

export function SharePanel({
  firstName,
  company,
  linkToken,
}: {
  firstName: string;
  company: string;
  linkToken: string;
}) {
  const link = personalLink(linkToken);

  return (
    <div className="space-y-4">
      <p className="text-[15px] text-ink-soft">
        Your own link and code — not {company}&apos;s. Anyone who signs up through these is
        credited to you, {firstName}, so a colleague on the same job cannot claim your
        households by accident.
      </p>

      <div className="flex justify-center py-1">
        <QrCode value={link} />
      </div>

      <CopyBlock label="Your personal link" value={link} />

      <p className="text-[13px] text-ink-mute">
        Show the code at the door or send the link. Either way it is the same credit.
      </p>
    </div>
  );
}
