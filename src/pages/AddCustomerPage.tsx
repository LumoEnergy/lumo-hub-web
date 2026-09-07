import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { REWARD_GBP } from '../state';
import { useDemoStore } from '../store/DemoStore';
import type { CustomerDraft } from '../store/DemoStore';
import { QrCode, personalLink } from '../components/PersonalLink';
import {
  Button,
  Card,
  CopyBlock,
  Field,
  ScreenTitle,
  SectionHeading,
  SelectField,
} from '../components/ui';

/**
 * Add a customer.
 *
 * The single-customer form is the default path, because the criterion that matters is
 * an installer getting from landing to one customer invited in under sixty seconds on
 * a phone, and a five-row grid is a slower and more intimidating way to enter one
 * person. "Add several" is a disclosure for the van-full-of-jobs case.
 *
 * The contact fork is the actual research question: does an installer want Lumo to do
 * the chasing, or do they guard the relationship? Both answers are recorded as
 * distinct invite states rather than collapsed into "invited", because if the answer
 * is "I'll do it" then the whole "Lumo will contact them" proposition is worth less
 * than it looks.
 */

const INVERTERS = [
  'GivEnergy',
  'SolarEdge',
  'Fox ESS',
  'Tesla',
  'Sungrow',
  'SolaX',
  'Growatt',
  'Huawei',
  'Other',
] as const;

const BATTERY_SIZES = ['5.0', '5.2', '8.2', '9.5', '10.4', '13.5', '16.0', '20.8'] as const;

type Stage = 'details' | 'fork' | 'lumo-sends' | 'you-send' | 'done';

interface FormRow {
  firstName: string;
  lastName: string;
  email: string;
  inverterMake: string;
  batterySizeKwh: string;
}

const emptyRow = (): FormRow => ({
  firstName: '',
  lastName: '',
  email: '',
  inverterMake: 'GivEnergy',
  batterySizeKwh: '9.5',
});

const isComplete = (row: FormRow) =>
  row.firstName.trim() !== '' && row.lastName.trim() !== '' && row.email.includes('@');

export function AddCustomerPage() {
  const navigate = useNavigate();
  const { addCustomers, markStagedForLumo, markSentByInstaller, installer } = useDemoStore();

  const [stage, setStage] = useState<Stage>('details');
  const [several, setSeveral] = useState(false);
  const [single, setSingle] = useState<FormRow>(emptyRow);
  const [grid, setGrid] = useState<FormRow[]>(() => Array.from({ length: 5 }, emptyRow));
  const [addedIds, setAddedIds] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);

  const drafts = useMemo<CustomerDraft[]>(() => {
    const rows = several ? grid : [single];
    return rows.filter(isComplete).map((row) => ({
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      inverterMake: row.inverterMake,
      batterySizeKwh: Number(row.batterySizeKwh),
    }));
  }, [several, grid, single]);

  const submit = () => {
    if (drafts.length === 0) return;
    setBusy(true);
    // A beat, so the demo feels like it did something rather than teleporting. There
    // is nothing to wait for — that is the point of this build.
    setTimeout(() => {
      setAddedIds(addCustomers(drafts));
      setBusy(false);
      setStage('fork');
    }, 400);
  };

  if (stage === 'fork') {
    return (
      <ContactFork
        count={addedIds.length}
        firstName={drafts[0]?.firstName ?? ''}
        onLumo={() => {
          markStagedForLumo(addedIds);
          setStage('lumo-sends');
        }}
        onSelf={() => setStage('you-send')}
      />
    );
  }

  if (stage === 'lumo-sends') {
    return (
      <LumoSends
        count={addedIds.length}
        firstName={drafts[0]?.firstName ?? ''}
        installerName={`${installer.firstName} ${installer.lastName}`}
        company={installer.company}
        onDone={() => navigate('/')}
      />
    );
  }

  if (stage === 'you-send') {
    return (
      <YouSend
        count={addedIds.length}
        firstName={drafts[0]?.firstName ?? ''}
        installerName={installer.firstName}
        company={installer.company}
        linkToken={installer.linkToken}
        onSent={() => {
          markSentByInstaller(addedIds);
          navigate('/');
        }}
        onLater={() => navigate('/')}
      />
    );
  }

  return (
    <>
      <ScreenTitle sub={`£${REWARD_GBP} once their smart control has run for 30 days in a row.`}>
        Add a customer
      </ScreenTitle>

      {several ? (
        <PasteGrid rows={grid} onChange={setGrid} />
      ) : (
        <Card className="mx-4 space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="First name"
              value={single.firstName}
              autoComplete="off"
              onChange={(e) => setSingle({ ...single, firstName: e.target.value })}
            />
            <Field
              label="Last name"
              value={single.lastName}
              autoComplete="off"
              onChange={(e) => setSingle({ ...single, lastName: e.target.value })}
            />
          </div>
          <Field
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={single.email}
            hint="The only way Lumo can tie their account back to you."
            onChange={(e) => setSingle({ ...single, email: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Inverter"
              options={INVERTERS}
              value={single.inverterMake}
              onChange={(value) => setSingle({ ...single, inverterMake: value })}
            />
            <SelectField
              label="Battery (kWh)"
              options={BATTERY_SIZES}
              value={single.batterySizeKwh}
              onChange={(value) => setSingle({ ...single, batterySizeKwh: value })}
            />
          </div>
        </Card>
      )}

      <div className="px-4 pt-4">
        <Button full disabled={drafts.length === 0 || busy} onClick={submit}>
          {busy
            ? 'Adding…'
            : drafts.length > 1
              ? `Continue with ${drafts.length}`
              : 'Continue'}
        </Button>
        <Button
          variant="quiet"
          full
          className="mt-1"
          onClick={() => setSeveral((current) => !current)}
        >
          {several ? 'Just one customer' : 'Add several'}
        </Button>
      </div>

      <p className="px-4 pt-3 pb-6 text-center text-[13px] text-ink-mute">
        Nothing is sent until you choose how they get contacted.
      </p>
    </>
  );
}

/**
 * Five rows, paste-friendly. Pasting a tab or comma separated block into the first
 * cell fills the grid, because the realistic input is a copy out of a spreadsheet or
 * a job sheet, not fifty taps on a phone keyboard.
 */
function PasteGrid({
  rows,
  onChange,
}: {
  rows: FormRow[];
  onChange: (rows: FormRow[]) => void;
}) {
  const [pasteNote, setPasteNote] = useState<string | null>(null);

  const handlePaste = (index: number, text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '');
    if (lines.length < 2 && !/[\t,]/.test(text)) return false;

    const next = [...rows];
    lines.slice(0, rows.length - index).forEach((line, offset) => {
      const parts = line.split(/\t|,/).map((part) => part.trim());
      const target = next[index + offset];
      next[index + offset] = {
        ...target,
        firstName: parts[0] ?? target.firstName,
        lastName: parts[1] ?? target.lastName,
        email: parts[2] ?? target.email,
      };
    });
    onChange(next);
    setPasteNote(`Filled ${Math.min(lines.length, rows.length - index)} rows from your paste.`);
    return true;
  };

  return (
    <>
      <SectionHeading>Up to five at a time</SectionHeading>
      <Card className="mx-4 divide-y divide-line">
        {rows.map((row, index) => (
          <div key={index} className="space-y-2 p-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="First name"
                aria-label={`First name, row ${index + 1}`}
                value={row.firstName}
                autoComplete="off"
                onPaste={(event) => {
                  if (handlePaste(index, event.clipboardData.getData('text'))) {
                    event.preventDefault();
                  }
                }}
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...row, firstName: event.target.value };
                  onChange(next);
                }}
                className="h-11 w-full rounded-chip border border-line-strong bg-surface px-2.5 text-[15px] text-ink placeholder:text-ink-mute"
              />
              <input
                placeholder="Last name"
                aria-label={`Last name, row ${index + 1}`}
                value={row.lastName}
                autoComplete="off"
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...row, lastName: event.target.value };
                  onChange(next);
                }}
                className="h-11 w-full rounded-chip border border-line-strong bg-surface px-2.5 text-[15px] text-ink placeholder:text-ink-mute"
              />
            </div>
            <input
              placeholder="Email"
              aria-label={`Email, row ${index + 1}`}
              type="email"
              inputMode="email"
              autoComplete="off"
              value={row.email}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...row, email: event.target.value };
                onChange(next);
              }}
              className="h-11 w-full rounded-chip border border-line-strong bg-surface px-2.5 text-[15px] text-ink placeholder:text-ink-mute"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label={`Inverter, row ${index + 1}`}
                value={row.inverterMake}
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...row, inverterMake: event.target.value };
                  onChange(next);
                }}
                className="h-11 w-full rounded-chip border border-line-strong bg-surface px-2 text-[15px] text-ink"
              >
                {INVERTERS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <select
                aria-label={`Battery size, row ${index + 1}`}
                value={row.batterySizeKwh}
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...row, batterySizeKwh: event.target.value };
                  onChange(next);
                }}
                className="h-11 w-full rounded-chip border border-line-strong bg-surface px-2 text-[15px] text-ink"
              >
                {BATTERY_SIZES.map((option) => (
                  <option key={option}>{option} kWh</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </Card>
      <p className="px-4 pt-2 text-[13px] text-ink-mute">
        {pasteNote ?? 'Paste a list into the first name box and it will fill the rows.'}
      </p>
    </>
  );
}

function ContactFork({
  count,
  firstName,
  onLumo,
  onSelf,
}: {
  count: number;
  firstName: string;
  onLumo: () => void;
  onSelf: () => void;
}) {
  const subject = count === 1 ? firstName : `${count} customers`;

  return (
    <>
      <ScreenTitle sub={`${subject} added. Nothing has been sent yet.`}>
        Who makes contact?
      </ScreenTitle>

      <div className="space-y-3 px-4">
        <ForkOption
          title="Lumo will contact them"
          body="We email them the offer and chase if they do not respond. You see exactly where they got to."
          note="Less work for you. Lumo is the first voice they hear."
          onClick={onLumo}
        />
        <ForkOption
          title="I'll contact them"
          body="You get the wording and your personal link to send however you like — email, WhatsApp, or the QR at the door."
          note="You keep the relationship. The chasing is yours."
          onClick={onSelf}
        />
      </div>

      <p className="px-4 pt-4 pb-6 text-[13px] text-ink-mute">
        Either way the £{REWARD_GBP} is credited to you.
      </p>
    </>
  );
}

function ForkOption({
  title,
  body,
  note,
  onClick,
}: {
  title: string;
  body: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="block w-full text-left">
      <Card className="p-4">
        <p className="text-[17px] font-bold text-ink">{title}</p>
        <p className="mt-1 text-[15px] text-ink-soft">{body}</p>
        <p className="mt-2 text-[13px] font-semibold text-ink-mute">{note}</p>
      </Card>
    </button>
  );
}

/**
 * Shows the exact email that would be sent, in full, before it goes.
 *
 * Nothing is hidden behind "we'll take it from here". The installer is lending Lumo
 * their customer relationship, and asking for that without showing the words is how
 * you lose it.
 */
function LumoSends({
  count,
  firstName,
  installerName,
  company,
  onDone,
}: {
  count: number;
  firstName: string;
  installerName: string;
  company: string;
  onDone: () => void;
}) {
  const name = count === 1 ? firstName : 'there';
  const body = `Hi ${name},

${installerName} at ${company} fitted your battery, and has recommended you for Lumo.

Lumo runs your battery around your energy tariff, so it charges when power is cheap and uses it when it is not. It works with the battery you already have, and it costs you nothing.

Connect your inverter and pick your tariff and you are set up. It takes about five minutes.

[ Get started ]

If you would rather not hear from us, you can unsubscribe below and we will not email again.`;

  return (
    <>
      <ScreenTitle sub="This is exactly what they will receive. Nothing is hidden.">
        Lumo will send this
      </ScreenTitle>

      <div className="space-y-3 px-4">
        <CopyBlock label="Subject" value={`${installerName} recommended Lumo for your battery`} />
        <CopyBlock label="Message" value={body} multiline />
      </div>

      <div className="px-4 pt-5">
        <Button full onClick={onDone}>
          Done
        </Button>
      </div>

      <p className="px-4 pt-3 pb-6 text-[13px] text-ink-mute">
        {count === 1 ? 'This customer is' : `These ${count} customers are`} now waiting for Lumo
        to send. You will see it change on your list.
      </p>
    </>
  );
}

/**
 * The installer-sends path. Read-only and copyable rather than editable: editable is
 * more useful and makes the copy untestable, and testing the copy is the point of
 * running this in front of five installers.
 */
function YouSend({
  count,
  firstName,
  installerName,
  company,
  linkToken,
  onSent,
  onLater,
}: {
  count: number;
  firstName: string;
  installerName: string;
  company: string;
  linkToken: string;
  onSent: () => void;
  onLater: () => void;
}) {
  const link = personalLink(linkToken);
  const name = count === 1 ? firstName : 'there';
  const body = `Hi ${name},

It's ${installerName} from ${company}. Now your battery is in, there's something worth doing with it.

Lumo runs it around your energy tariff, so it charges when power is cheap. It works with the battery we fitted and costs you nothing.

Sign up here: ${link}

Any questions, just reply to this.

${installerName}`;

  return (
    <>
      <ScreenTitle sub="Your link is already in it. Send it however you like.">
        Send it yourself
      </ScreenTitle>

      <div className="space-y-3 px-4">
        <CopyBlock label="Subject" value="Worth doing with your new battery" />
        <CopyBlock label="Message" value={body} multiline />

        <Card className="flex flex-col items-center gap-2 p-4">
          <p className="text-[13px] font-semibold text-ink-soft">Or show them this</p>
          <QrCode value={link} size={160} />
          <p className="text-center text-[13px] text-ink-mute">
            Same credit as the link. Useful at the door.
          </p>
        </Card>
      </div>

      <div className="space-y-1 px-4 pt-5 pb-6">
        <Button full onClick={onSent}>
          I&apos;ve sent it
        </Button>
        <Button variant="quiet" full onClick={onLater}>
          I&apos;ll do it later
        </Button>
        <p className="pt-2 text-center text-[13px] text-ink-mute">
          Telling us you have sent it is what starts the clock on chasing them.
        </p>
      </div>
    </>
  );
}
