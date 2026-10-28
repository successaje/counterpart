import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';

/**
 * The loop, drawn. Three machines, one request travelling between them:
 * from the room into the runner, held at the gate until the Desk decides,
 * through collection and redaction, back to the room as a release, and on
 * to the project's machine where the helpdesk reproduces it. The steps
 * under the drawing drive it; hovering pauses it; reduced motion shows the
 * finished state.
 */

type NodeId =
  | 'agent'
  | 'menu'
  | 'gate'
  | 'collect'
  | 'redact'
  | 'desk'
  | 'ledger'
  | 'dev'
  | 'help'
  | 'helpdesk'
  | 'checkout'
  | 'repro'
  | 'fix'
  | 'issue';

interface Beat {
  step: number;
  packet: readonly [number, number];
  active: readonly NodeId[];
  /** How many room messages are visible. */
  messages: number;
  note?: string;
  hold: number;
}

export const STEPS = [
  {
    title: 'Your agent opens a case in the room',
    body: 'A Switch room where the project’s helpdesk agent lives. Both agents have owners; both run on their owners’ machines.',
  },
  {
    title: 'The helpdesk asks for evidence by name',
    body: 'Versions, config, a command from your menu, a sandboxed script, the recent diff, a patch to try. The runner checks the request against runner.yaml.',
  },
  {
    title: 'You decide in the Desk',
    body: 'Anything that runs code waits for you. Allow once, allow for the case, or decline with a reason. A message in the room is never an approval.',
  },
  {
    title: 'The runner collects and redacts',
    body: 'No shell, a network-denied sandbox for scripts, and secrets, emails, addresses and home paths removed before your agent sees the output.',
  },
  {
    title: 'The release goes back as an evidence card',
    body: 'Only what you allowed leaves. The raw record stays in the ledger on your machine, next to who asked and who decided.',
  },
  {
    title: 'They reproduce, fix, and only then file',
    body: 'The helpdesk reproduces against the library on its own machine, proposes a patch your agent verifies under approval, and files an issue with confidence “reproduced”.',
  },
] as const;

const MESSAGES: ReadonlyArray<{ from: 'dev' | 'help' | 'note'; lines: readonly string[] }> = [
  { from: 'dev', lines: ['Case: two tests fail since', 'cachekit 3.1.4 → 3.2.0 (ENOENT).'] },
  { from: 'help', lines: ['E3 test with the verbose flag,', 'please. I want the full path.'] },
  { from: 'note', lines: ['owner allowed E3 once · via the Desk'] },
  { from: 'dev', lines: ['E3 released · 3 path, 1 secret,', '1 email redacted · exit code 1'] },
  { from: 'help', lines: ['Reproduced against 3.2.0.', 'Filing cachekit#213 with the card.'] },
];

/** Where the request sits at each node: on an edge or in empty space, never over a label. */
const P = {
  agent: [176, 78],
  dev: [400, 78],
  help: [496, 78],
  helpdesk: [784, 78],
  menu: [74, 150],
  gate: [142, 150],
  collect: [210, 150],
  redact: [278, 150],
  desk: [188, 274],
  ledger: [278, 316],
  checkout: [784, 140],
  repro: [784, 192],
  fix: [784, 244],
  issue: [784, 316],
} as const satisfies Record<NodeId, readonly [number, number]>;

const BEATS: readonly Beat[] = [
  { step: 0, packet: P.agent, active: ['agent'], messages: 0, hold: 1100 },
  { step: 0, packet: P.dev, active: ['dev'], messages: 1, hold: 1500 },
  { step: 1, packet: P.help, active: ['help', 'helpdesk'], messages: 2, hold: 1500 },
  {
    step: 1,
    packet: P.menu,
    active: ['menu'],
    messages: 2,
    note: 'checked against runner.yaml: test is on the menu',
    hold: 1500,
  },
  {
    step: 2,
    packet: P.gate,
    active: ['gate'],
    messages: 2,
    note: 'E3 runs code, so it waits for you',
    hold: 1300,
  },
  { step: 2, packet: P.desk, active: ['desk'], messages: 3, note: 'Allow once', hold: 1700 },
  {
    step: 3,
    packet: P.collect,
    active: ['collect'],
    messages: 3,
    note: 'sh test.sh --verbose, as an argument list, no shell',
    hold: 1500,
  },
  {
    step: 3,
    packet: P.redact,
    active: ['redact'],
    messages: 3,
    note: '3 home paths, 1 secret, 1 email removed',
    hold: 1500,
  },
  {
    step: 3,
    packet: P.ledger,
    active: ['ledger'],
    messages: 3,
    note: 'the raw record stays here',
    hold: 1300,
  },
  { step: 4, packet: P.agent, active: ['agent'], messages: 3, hold: 900 },
  { step: 4, packet: P.dev, active: ['dev'], messages: 4, hold: 1700 },
  { step: 5, packet: P.helpdesk, active: ['help', 'helpdesk'], messages: 4, hold: 1000 },
  { step: 5, packet: P.checkout, active: ['checkout'], messages: 4, hold: 1000 },
  { step: 5, packet: P.repro, active: ['repro'], messages: 4, hold: 1200 },
  { step: 5, packet: P.fix, active: ['fix'], messages: 4, hold: 1200 },
  { step: 5, packet: P.issue, active: ['issue'], messages: 5, hold: 3000 },
];

const FIRST_BEAT = STEPS.map((_, step) => BEATS.findIndex((b) => b.step === step));

function beatAt(i: number): Beat {
  const b = BEATS[i];
  if (!b) throw new Error(`no beat ${i}`);
  return b;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true), {
      threshold: 0.2,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}

export function Flow() {
  const reduced = useReducedMotion();
  const [wrapRef, inView] = useInView<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  const [beat, setBeat] = useState(0);
  const current = beatAt(beat);

  useEffect(() => {
    if (reduced) setBeat(BEATS.length - 1);
  }, [reduced]);

  useEffect(() => {
    if (reduced || paused || !inView) return;
    const t = setTimeout(() => setBeat((b) => (b + 1) % BEATS.length), BEATS[beat]?.hold ?? 1200);
    return () => clearTimeout(t);
  }, [beat, reduced, paused, inView]);

  const is = (id: NodeId) => current.active.includes(id);
  const step = STEPS[current.step] ?? STEPS[0];

  return (
    <div className="space-y-6">
      <div
        ref={wrapRef}
        className="scrollbar-thin overflow-x-auto rounded-lg border border-line bg-surface shadow-card"
      >
        <svg
          viewBox="0 0 960 400"
          className="block h-auto w-full min-w-[880px] select-none"
          role="img"
          aria-labelledby="flow-title"
          fontFamily="var(--font-sans)"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <title id="flow-title">
            A request travels from the Switch room into the runner on your machine, waits at the
            approval gate for the Desk, is collected and redacted, and returns to the room as a
            release; the helpdesk reproduces it on the project’s machine.
          </title>
          <defs>
            <marker
              id="flow-arrow"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,0.5 L7,4 L0,7.5 Z" className="fill-line-strong" />
            </marker>
          </defs>

          <Panel x={16} y={24} w={320} h={360} title="Your machine" />
          <Panel x={368} y={24} w={224} h={360} title="Switch room" />
          <Panel x={624} y={24} w={320} h={360} title="Project’s machine" />

          {/* wires */}
          <g className="stroke-line-strong" fill="none" strokeWidth={1.25}>
            <path d="M176,96 V119" markerEnd="url(#flow-arrow)" />
            <path d="M104,172 H111" markerEnd="url(#flow-arrow)" />
            <path d="M172,172 H179" markerEnd="url(#flow-arrow)" />
            <path d="M240,172 H247" markerEnd="url(#flow-arrow)" />
            <path d="M142,194 V256" strokeDasharray="3 3" />
            <path d="M278,194 V315" markerEnd="url(#flow-arrow)" />
            <path d="M320,78 H384" />
            <path d="M576,78 H640" />
            <path d="M784,96 V119" markerEnd="url(#flow-arrow)" />
            <path d="M784,160 V171" markerEnd="url(#flow-arrow)" />
            <path d="M784,212 V223" markerEnd="url(#flow-arrow)" />
            <path d="M784,264 V315" markerEnd="url(#flow-arrow)" />
          </g>

          {/* your machine */}
          <Node
            x={32}
            y={60}
            w={288}
            h={36}
            title="Coding agent"
            sub="MCP client"
            active={is('agent')}
          />
          <rect
            x={32}
            y={120}
            width={288}
            height={108}
            rx={8}
            className="fill-paper stroke-line"
            strokeWidth={1}
          />
          <text x={44} y={139} className="fill-ink-faint" fontSize={9.5} letterSpacing={0.8}>
            COUNTERPART RUNNER
          </text>
          <Stage x={44} title="menu" sub="allowlist" active={is('menu')} />
          <Stage x={112} title="gate" sub="you allow" active={is('gate')} />
          <Stage x={180} title="collect" sub="sandbox" active={is('collect')} />
          <Stage x={248} title="redact" sub="secrets out" active={is('redact')} />
          <Node
            x={82}
            y={256}
            w={120}
            h={36}
            title="Desk"
            sub="you decide here"
            active={is('desk')}
          />
          <Strip
            x={32}
            y={316}
            w={288}
            label="ledger"
            sub="every request, decision and release · raw stays here"
            active={is('ledger')}
          />

          {/* room */}
          <Chip x={384} y={62} label="dev-agent" sub="yours" active={is('dev')} />
          <Chip x={480} y={62} label="helpdesk" sub="theirs" active={is('help')} />
          {MESSAGES.map((m, i) => (
            <Bubble key={m.lines[0]} index={i} message={m} visible={i < current.messages} />
          ))}

          {/* project's machine */}
          <Node
            x={640}
            y={60}
            w={288}
            h={36}
            title="Helpdesk agent"
            sub="on the maintainer’s machine"
            active={is('helpdesk')}
          />
          <Node
            x={640}
            y={120}
            w={288}
            h={40}
            title="Library checkout"
            sub="the version you reported against"
            active={is('checkout')}
          />
          <Node
            x={640}
            y={172}
            w={288}
            h={40}
            title="Reproduce"
            sub="in its own sandbox, from your evidence"
            active={is('repro')}
          />
          <Node
            x={640}
            y={224}
            w={288}
            h={40}
            title="Propose a fix"
            sub="a unified diff, verified by your runner as E6"
            active={is('fix')}
          />
          <Strip
            x={640}
            y={316}
            w={288}
            label="issue tracker"
            sub="filed only with confidence “reproduced”"
            active={is('issue')}
          />

          {/* the request */}
          <g
            style={{
              transform: `translate(${current.packet[0]}px, ${current.packet[1]}px)`,
              transition: 'transform 650ms cubic-bezier(0.25, 1, 0.5, 1)',
            }}
          >
            <circle r={11} className="fill-accent/20" />
            <circle r={5} className="fill-accent stroke-surface" strokeWidth={1.5} />
          </g>
        </svg>
      </div>

      <p
        className="flex min-h-6 flex-wrap items-baseline gap-x-3 gap-y-1 text-sm"
        aria-live="polite"
      >
        <span className="font-mono text-xs text-accent">{current.step + 1}/6</span>
        <span className="font-medium text-ink">{step.title}</span>
        {current.note ? <span className="text-ink-muted">· {current.note}</span> : null}
      </p>

      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s, i) => {
          const active = i === current.step;
          return (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => setBeat(FIRST_BEAT[i] ?? 0)}
                aria-current={active ? 'step' : undefined}
                className={clsx(
                  'flex h-full w-full gap-3 rounded-lg border p-3 text-left transition-colors duration-200',
                  active
                    ? 'border-accent/40 bg-surface shadow-card'
                    : 'border-line hover:border-line-strong',
                )}
              >
                <span
                  className={clsx(
                    'flex size-6 shrink-0 items-center justify-center rounded-sm border font-mono text-2xs transition-colors',
                    active
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-line bg-surface text-ink-muted',
                  )}
                >
                  {i + 1}
                </span>
                <span className="space-y-1">
                  <span className="block text-sm font-semibold leading-snug text-ink">
                    {s.title}
                  </span>
                  <span className="block text-xs leading-relaxed text-ink-muted">{s.body}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Panel({
  x,
  y,
  w,
  h,
  title,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        className="fill-sunken/50 stroke-line"
        strokeWidth={1}
      />
      <text
        x={x + 12}
        y={y + 18}
        className="fill-ink-faint"
        fontSize={9.5}
        fontWeight={600}
        letterSpacing={1}
      >
        {title.toUpperCase()}
      </text>
    </g>
  );
}

const box = (active: boolean) =>
  clsx(
    'transition-[fill,stroke] duration-300',
    active ? 'fill-accent-soft stroke-accent' : 'fill-surface stroke-line-strong',
  );

function Node({
  x,
  y,
  w,
  h,
  title,
  sub,
  active,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  active: boolean;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} className={box(active)} strokeWidth={1} />
      <text x={x + 12} y={y + h / 2 - 2} className="fill-ink" fontSize={11} fontWeight={600}>
        {title}
      </text>
      <text x={x + 12} y={y + h / 2 + 10} className="fill-ink-muted" fontSize={9}>
        {sub}
      </text>
    </g>
  );
}

function Stage({
  x,
  title,
  sub,
  active,
}: {
  x: number;
  title: string;
  sub: string;
  active: boolean;
}) {
  return (
    <g>
      <rect x={x} y={150} width={60} height={44} rx={6} className={box(active)} strokeWidth={1} />
      <text
        x={x + 30}
        y={169}
        textAnchor="middle"
        className="fill-ink"
        fontSize={11}
        fontWeight={600}
      >
        {title}
      </text>
      <text x={x + 30} y={182} textAnchor="middle" className="fill-ink-muted" fontSize={8.5}>
        {sub}
      </text>
    </g>
  );
}

function Strip({
  x,
  y,
  w,
  label,
  sub,
  active,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  sub: string;
  active: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={28}
        rx={6}
        className={box(active)}
        strokeWidth={1}
        strokeDasharray={active ? undefined : '3 3'}
      />
      <text x={x + 12} y={y + 18} className="fill-ink" fontSize={10.5} fontWeight={600}>
        {label}
      </text>
      <text x={x + w - 12} y={y + 18} textAnchor="end" className="fill-ink-muted" fontSize={8.5}>
        {sub}
      </text>
    </g>
  );
}

function Chip({
  x,
  y,
  label,
  sub,
  active,
}: {
  x: number;
  y: number;
  label: string;
  sub: string;
  active: boolean;
}) {
  return (
    <g>
      <rect x={x} y={y} width={96} height={32} rx={16} className={box(active)} strokeWidth={1} />
      <circle
        cx={x + 16}
        cy={y + 16}
        r={6}
        className={active ? 'fill-accent' : 'fill-line-strong'}
      />
      <text x={x + 28} y={y + 14} className="fill-ink" fontSize={10} fontWeight={600}>
        {label}
      </text>
      <text x={x + 28} y={y + 25} className="fill-ink-muted" fontSize={8.5}>
        {sub}
      </text>
    </g>
  );
}

const BUBBLE_Y = [108, 162, 216, 252, 306] as const;

function Bubble({
  index,
  message,
  visible,
}: {
  index: number;
  message: { from: 'dev' | 'help' | 'note'; lines: readonly string[] };
  visible: boolean;
}) {
  const y = BUBBLE_Y[index] ?? 108;
  const note = message.from === 'note';
  const x = message.from === 'help' ? 392 : 380;
  const h = note ? 28 : 46;
  return (
    <g
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(4px)',
        transition: 'opacity 300ms ease-out, transform 300ms ease-out',
      }}
    >
      <rect
        x={x}
        y={y}
        width={188}
        height={h}
        rx={6}
        className={note ? 'fill-pending-soft stroke-pending/40' : 'fill-surface stroke-line'}
        strokeWidth={1}
      />
      {note ? (
        <text x={x + 10} y={y + 18} className="fill-pending" fontSize={9} fontWeight={500}>
          {message.lines[0]}
        </text>
      ) : (
        <>
          <text x={x + 10} y={y + 13} className="fill-ink-faint" fontSize={8} fontWeight={600}>
            {message.from === 'dev' ? 'dev-agent' : 'cachekit-helpdesk'}
          </text>
          {message.lines.map((line, i) => (
            <text key={line} x={x + 10} y={y + 26 + i * 12} className="fill-ink" fontSize={9.5}>
              {line}
            </text>
          ))}
        </>
      )}
    </g>
  );
}
