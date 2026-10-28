import { EVIDENCE_INFO, EVIDENCE_TYPES } from '@counterpart/protocol';
import { Button, Code, Mono, Pill, Wordmark } from '@counterpart/ui';
import { clsx } from 'clsx';
import { ArrowRight, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { Demo } from './components/Demo.js';
import { Flow } from './components/Flow.js';
import { HACKATHON, REPO, SWITCH } from './links.js';

const NAV = [
  { href: '#demo', label: 'See it' },
  { href: '#how', label: 'How it works' },
  { href: '#evidence', label: 'Evidence' },
  { href: '#install', label: 'Install' },
];

export function App() {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#top" className="shrink-0">
            <Wordmark />
          </a>
          <nav
            className="hidden items-center gap-5 text-sm text-ink-muted md:flex"
            aria-label="Sections"
          >
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-ink">
                {n.label}
              </a>
            ))}
          </nav>
          <a
            href={REPO}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-xs font-medium text-ink hover:bg-sunken"
          >
            GitHub <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </header>

      <main id="top">
        <Hero />
        <Section
          id="demo"
          eyebrow="See it"
          title="One request, start to finish."
          lede="Scripted conversation, real redaction: the output below goes through the protocol's rules in your browser."
        >
          <Demo />
        </Section>
        <How />
        <Evidence />
        <Guarantees />
        <WhySwitch />
        <Install />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-ink-muted sm:px-6">
          <span className="inline-flex items-center gap-2">
            <Wordmark compact /> Counterpart · Apache-2.0
          </span>
          <span>
            Built for{' '}
            <a href={HACKATHON} className="text-ink underline-offset-2 hover:underline">
              Flip the Switch
            </a>{' '}
            on{' '}
            <a href={SWITCH} className="text-ink underline-offset-2 hover:underline">
              Switch
            </a>
            .
          </span>
        </div>
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
        <div className="space-y-6">
          <Pill tone="info" dot>
            built on Switch
          </Pill>
          <h1 className="max-w-[16ch] text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            Support where both sides bring an agent.
          </h1>
          <p className="prose-measure text-lg text-ink-muted">
            Your coding agent and a project’s helpdesk agent work a dependency bug in one shared
            room. Evidence is collected on your machine, under your approval, redacted before it
            leaves. Maintainers hear about bugs once they are reproduced, not before.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href="#install">
              <Button variant="solid" size="lg" iconRight={<ArrowRight />}>
                Install the CLI
              </Button>
            </a>
            <a href="#demo">
              <Button variant="outline" size="lg">
                Watch a request
              </Button>
            </a>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm lg:grid-cols-1">
          <Fact k="Runs" v="On your laptop. The runner never gives anyone a shell." />
          <Fact
            k="Asks"
            v="Six named evidence types. Everything else is refused, and the refusal is recorded."
          />
          <Fact
            k="Leaves"
            v="Only what you allowed, after secrets, emails, addresses and home paths are removed."
          />
          <Fact
            k="Keeps"
            v="A ledger of every request, decision and release, with the raw record that stayed."
          />
        </dl>
      </div>
    </section>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-t border-line pt-3">
      <dt className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">{k}</dt>
      <dd className="mt-1 text-ink-muted">{v}</dd>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={clsx('scroll-mt-16 border-t border-line', className)}>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-2xl space-y-2">
          <p className="text-2xs font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
          {lede ? <p className="text-ink-muted">{lede}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function How() {
  return (
    <Section
      id="how"
      eyebrow="How it works"
      title="Evidence from your machine, knowledge from theirs."
      lede="One request, drawn. The dot is the request; it never leaves your machine without passing the gate. Hover to pause, pick a step to jump."
    >
      <Flow />
    </Section>
  );
}

function Evidence() {
  return (
    <Section
      id="evidence"
      eyebrow="The menu"
      title="Six things a helpdesk can ask for."
      lede={
        <>
          Declared in <Mono>.counterpart/runner.yaml</Mono> and committed with your project. The
          reporter sets the command list, the readable paths and which types ask every time.
        </>
      }
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EVIDENCE_TYPES.map((t) => {
          const e = EVIDENCE_INFO[t];
          return (
            <li
              key={t}
              className="space-y-2 rounded-lg border border-line bg-surface p-4 shadow-card"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold">
                  <Code code={e.code} /> {e.title}
                </span>
                <Pill tone={e.defaultApproval === 'ask' ? 'pending' : 'accent'}>
                  {e.defaultApproval === 'ask' ? 'asks you' : 'automatic'}
                </Pill>
              </div>
              <p className="text-sm text-ink-muted">{e.summary}</p>
              <div className="flex gap-1.5">
                <Pill tone={e.executes ? 'pending' : 'neutral'}>
                  {e.executes ? 'runs code' : 'read only'}
                </Pill>
                {e.mutates ? <Pill tone="danger">changes files</Pill> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Guarantees() {
  const does = [
    [
      'Approval is yours',
      'Decisions are made in the Desk or your terminal, on your machine. A message in the room, from anyone, is never an approval.',
    ],
    [
      'Commands are a list, not a shell',
      'Menu entries are argv arrays. No expansion, no pipes, no “just run this”.',
    ],
    [
      'Reproductions are sandboxed',
      'Posted scripts run in a fresh temp directory with the network denied. No sandbox on the machine means no E4.',
    ],
    [
      'Redaction before release',
      'Keys, tokens, URL credentials, emails, IP addresses, home paths and every dotenv value go before your agent sees the output.',
    ],
    [
      'Everything is in the ledger',
      'Requests, verbatim. Refusals, verbatim. Who decided, when, through what. The raw record that stayed.',
    ],
  ];
  const doesNot = [
    'Redaction is pattern based. A secret that looks like an ordinary word gets through; a version string can be mistaken for an address.',
    'A command on your menu can do whatever that command does. Put only checks you would run for a stranger on it.',
    'E6 changes your working tree. Nothing is committed, and the patch is in the record, but you are trusting the diff you approved.',
    'The sandbox denies the network. It does not hide the rest of your filesystem from a script; keep E4 for small reproductions.',
  ];
  return (
    <Section
      id="guarantees"
      eyebrow="Nothing leaves without you"
      title="What the runner enforces, and what it does not."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <ul className="space-y-4">
          {does.map(([h, b]) => (
            <li key={h} className="flex gap-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-hidden />
              <div>
                <h3 className="font-semibold">{h}</h3>
                <p className="prose-measure text-sm text-ink-muted">{b}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-dashed border-line-strong p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Not promised
          </h3>
          <ul className="mt-3 space-y-3">
            {doesNot.map((b) => (
              <li key={b} className="prose-measure text-sm text-ink-muted">
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

function WhySwitch() {
  return (
    <Section id="switch" eyebrow="Why Switch" title="Two owners, two machines, one room.">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <p className="prose-measure text-ink-muted">
          Every agent product today runs one organisation’s agent for one organisation. Counterpart
          needs the opposite: your agent, on your laptop, and the project’s agent, on theirs,
          addressing each other in a channel both owners can read, with permission cards and a
          record of who decided what.{' '}
          <a href={SWITCH} className="text-ink underline-offset-2 hover:underline">
            Switch
          </a>{' '}
          is the open-source layer that does exactly that, across Slack, Discord, Teams, Telegram
          and Mattermost. Remove it and there is no room, no cross-owner addressing, and no second
          agent: Counterpart would collapse into one more bot that one side runs on the other’s
          behalf.
        </p>
        <ul className="space-y-2 text-sm">
          {[
            'Agents are registered by their owners and run where their owners run them.',
            'Rooms carry addressing policies: who may give an agent instructions.',
            'Permission cards let the person at the keyboard decide; Switch records who did.',
            'Room documents hold the case ledger the helpdesk maintains.',
          ].map((t) => (
            <li key={t} className="flex gap-2 text-ink-muted">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-info" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function Install() {
  const steps: Array<[string, string, string]> = [
    [
      'Install',
      'npm install -g counterpart',
      'Node 20 or newer. One binary: the CLI, the MCP server and the Desk.',
    ],
    [
      'Set up your project',
      'counterpart init',
      'Detects your test and build scripts, writes .counterpart/runner.yaml, ignores the ledger. Review it, commit it.',
    ],
    [
      'Connect your agent',
      'claude mcp add counterpart -- counterpart mcp',
      'Works with any MCP client. The server tells the agent the rules of engagement.',
    ],
    [
      'Open the Desk',
      'counterpart desk',
      'Starts the local server and opens the page where you decide requests and read the ledger.',
    ],
  ];
  return (
    <Section
      id="install"
      eyebrow="Install"
      title="Four commands on the reporter’s side."
      lede="Maintainers run a helpdesk agent in a Switch room with the project checkout; the room template ships with the hackathon submission."
    >
      <ol className="grid gap-4 md:grid-cols-2">
        {steps.map(([h, cmd, b], i) => (
          <li
            key={h}
            className="space-y-2 rounded-lg border border-line bg-surface p-4 shadow-card"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-ink-faint">{i + 1}</span>
              <h3 className="font-semibold">{h}</h3>
            </div>
            <pre className="overflow-x-auto rounded-md border border-line bg-sunken px-3 py-2 font-mono text-xs text-ink">
              $ {cmd}
            </pre>
            <p className="text-sm text-ink-muted">{b}</p>
          </li>
        ))}
      </ol>
      <p className="text-sm text-ink-muted">
        Everything is open source under Apache-2.0:{' '}
        <a href={REPO} className="text-ink underline-offset-2 hover:underline">
          github.com/successaje/counterpart
        </a>
        . The package is not on npm yet; build from the repository until it is.
      </p>
    </Section>
  );
}
