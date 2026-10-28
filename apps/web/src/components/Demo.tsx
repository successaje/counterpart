import { compileRules, redactText } from '@counterpart/protocol';
import { Button, Card, Code, Mono, Pill, PrincipalChip, Wordmark } from '@counterpart/ui';
import { Check, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { type Message, Transcript } from './Transcript.js';

/**
 * A faithful miniature of the real flow. The transcript is scripted; the
 * redaction is not: the raw output below goes through the protocol's actual
 * rules in your browser, and the counts you see are what they produced.
 */

const RAW_OUTPUT = `RUN  v2.1.0 /Users/alice/code/sample-app

 ✓ src/cache.spec.ts > warms the cache (12ms)
 × src/cache.spec.ts > restores from s3
   Error: ENOENT: no such file or directory, open '/Users/alice/code/sample-app/.cache/cachekit/index.json'
   at CacheKitS3.restore (node_modules/cachekit-s3/dist/index.js:88:11)
 × src/cache.spec.ts > evicts expired entries
   Error: ENOENT: no such file or directory, open '/Users/alice/code/sample-app/.cache/cachekit/index.json'

Test Files  1 failed (1)
     Tests  2 failed | 1 passed (3)
debug: S3_SECRET_ACCESS_KEY=example-secret-not-real-00000000 bucket=acme-internal-cache owner=alice@example.com`;

const RULES = compileRules({ literals: ['acme-internal'] });

const OPENING: Message[] = [
  {
    id: 'm1',
    from: 'dev-agent',
    text: 'Opening a case for sample-app: two tests fail since upgrading cachekit 3.1.4 → 3.2.0. Both throw ENOENT on .cache/cachekit/index.json from cachekit-s3.',
  },
  {
    id: 'm2',
    from: 'cachekit-helpdesk',
    text: 'Thanks. Two things first: E1 versions for cachekit and cachekit-s3, then E3 `test` with the verbose flag so I can see the full path.',
  },
  {
    id: 'm3',
    from: 'dev-agent',
    text: 'E1 released (automatic by policy): node 24.2.0, pnpm 10.2.1 · cachekit 3.2.0 · cachekit-s3 0.4.1 · Darwin arm64. E3 runs code, so it needs my owner’s approval. Waiting.',
  },
];

type Stage = 'pending' | 'collecting' | 'released' | 'diagnosed' | 'fixed' | 'declined';

export function Demo() {
  const [stage, setStage] = useState<Stage>('pending');
  const redacted = useMemo(() => redactText(RAW_OUTPUT, RULES), []);
  const counts = Object.entries(redacted.counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');

  useEffect(() => {
    if (stage === 'collecting') {
      const t = setTimeout(() => setStage('released'), 1400);
      return () => clearTimeout(t);
    }
    if (stage === 'released') {
      const t = setTimeout(() => setStage('diagnosed'), 2200);
      return () => clearTimeout(t);
    }
    if (stage === 'diagnosed') {
      const t = setTimeout(() => setStage('fixed'), 2600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [stage]);

  const tail = redacted.text.split('\n').slice(3, 6).join('\n');
  const messages: Message[] = [...OPENING];
  if (stage === 'declined') {
    messages.push({
      id: 'm4d',
      from: 'dev-agent',
      text: 'My owner declined E3 for now: “That run touches a shared bucket; ask for the repro script instead.” Happy to run an E4 in the sandbox.',
    });
  }
  if (stage === 'released' || stage === 'diagnosed' || stage === 'fixed') {
    messages.push({
      id: 'm4',
      from: 'dev-agent',
      text: `E3 test (verbose) released · exit 1 · 0.9s · redacted: ${counts}.`,
      code: tail,
    });
  }
  if (stage === 'diagnosed' || stage === 'fixed') {
    messages.push({
      id: 'm5',
      from: 'cachekit-helpdesk',
      text: 'Reproduced here against cachekit 3.2.0 + cachekit-s3 0.4.1. 3.2.0 moved the default directory to .cachekit (changelog #212); the plugin still reads .cache/cachekit/index.json. Until the plugin ships a fix, pin dir: ".cache/cachekit". Sending it as E6 apply-fix, verify with `test`.',
    });
  }
  if (stage === 'fixed') {
    messages.push({
      id: 'm6',
      from: 'dev-agent',
      text: 'E6 applied under owner approval; `test` now passes 3/3. Case moved to fix-verified. Filing the plugin bug with the evidence card.',
    });
  }
  const typing =
    stage === 'released' ? 'cachekit-helpdesk' : stage === 'diagnosed' ? 'dev-agent' : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-h-[28rem]">
        <Transcript messages={messages} typing={typing} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-2">
            <Wordmark compact /> the Desk, on your laptop
          </span>
          {stage !== 'pending' ? (
            <button
              type="button"
              onClick={() => setStage('pending')}
              className="inline-flex items-center gap-1 text-ink-faint hover:text-ink"
            >
              <RotateCcw className="size-3" /> replay
            </button>
          ) : null}
        </div>

        <Card
          rule={stage === 'pending' ? 'pending' : stage === 'declined' ? 'danger' : 'accent'}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1.5">
              <span className="flex items-center gap-2">
                <Code code="E3" />
                <span className="font-semibold text-ink">
                  Command <Mono>test</Mono>
                </span>
              </span>
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                <PrincipalChip name="cachekit-helpdesk" kind="agent" side="project" />
                <span>asked just now</span>
              </div>
            </div>
            <Pill
              tone={
                stage === 'pending'
                  ? 'pending'
                  : stage === 'collecting'
                    ? 'info'
                    : stage === 'declined'
                      ? 'danger'
                      : 'accent'
              }
              dot
              live={stage === 'pending' || stage === 'collecting'}
            >
              {stage === 'pending'
                ? 'Waiting for you'
                : stage === 'collecting'
                  ? 'Collecting'
                  : stage === 'declined'
                    ? 'Declined'
                    : 'Released'}
            </Pill>
          </div>

          <blockquote className="border-l-2 border-line-strong pl-3 text-sm italic text-ink-muted">
            “E3 test with the verbose flag so I can see the full path.”
          </blockquote>

          <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 rounded-md border border-line bg-paper/60 p-3 text-sm">
            <dt className="text-ink-faint">Will run</dt>
            <dd>
              <Mono>pnpm run test --reporter=verbose</Mono>
            </dd>
            <dt className="text-ink-faint">Where</dt>
            <dd>project root, no shell</dd>
            <dt className="text-ink-faint">Output</dt>
            <dd>truncated to 200 lines, redacted before release</dd>
          </dl>

          {stage === 'pending' ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="solid"
                tone="accent"
                icon={<Check />}
                onClick={() => setStage('collecting')}
              >
                Allow once
              </Button>
              <Button
                variant="outline"
                icon={<ShieldCheck />}
                onClick={() => setStage('collecting')}
              >
                Allow for this case
              </Button>
              <Button
                variant="ghost"
                tone="danger"
                icon={<X />}
                className="ml-auto"
                onClick={() => setStage('declined')}
              >
                Decline
              </Button>
            </div>
          ) : stage === 'collecting' ? (
            <Stages active={1} />
          ) : stage === 'declined' ? (
            <p className="text-sm text-ink-muted">
              Recorded in the ledger with your reason. Your agent relays it; nothing ran.
            </p>
          ) : (
            <Stages active={2} />
          )}
        </Card>

        {stage === 'released' || stage === 'diagnosed' || stage === 'fixed' ? (
          <Card className="animate-enter space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                Side by side
              </h4>
              <span className="text-2xs text-ink-faint">
                redaction ran in your browser just now
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-2xs font-medium uppercase tracking-wider text-danger">
                  Stayed on your machine
                </p>
                <pre className="overflow-x-auto rounded-md border border-line bg-sunken p-2.5 font-mono text-2xs leading-relaxed text-ink">
                  {RAW_OUTPUT.split('\n')
                    .slice(3, 6)
                    .concat(RAW_OUTPUT.split('\n').slice(-1))
                    .join('\n')}
                </pre>
              </div>
              <div className="space-y-1.5">
                <p className="text-2xs font-medium uppercase tracking-wider text-accent">
                  Left your machine
                </p>
                <pre className="overflow-x-auto rounded-md border border-line bg-sunken p-2.5 font-mono text-2xs leading-relaxed text-ink">
                  {redacted.text
                    .split('\n')
                    .slice(3, 6)
                    .concat(redacted.text.split('\n').slice(-1))
                    .join('\n')}
                </pre>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(redacted.counts).map(([k, v]) => (
                <Pill key={k} tone="accent" mono>
                  {v} {k}
                </Pill>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Stages({ active }: { active: 1 | 2 }) {
  const steps = ['Approved', 'Collecting and redacting', 'Released to your agent'];
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" aria-label="Progress">
      {steps.map((label, i) => {
        const state = i < active ? 'done' : i === active ? 'active' : 'todo';
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={
                state === 'done'
                  ? 'size-1.5 rounded-full bg-accent'
                  : state === 'active'
                    ? 'size-1.5 animate-pulse-dot rounded-full bg-info'
                    : 'size-1.5 rounded-full bg-line-strong'
              }
            />
            <span
              className={
                state === 'todo'
                  ? 'text-ink-faint'
                  : state === 'active'
                    ? 'font-medium text-ink'
                    : 'text-ink-muted'
              }
            >
              {label}
            </span>
            {i < steps.length - 1 ? (
              <span className="ml-1.5 h-px w-4 bg-line-strong" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
