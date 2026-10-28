import { EVIDENCE_INFO, type Release } from '@counterpart/protocol';
import { Code, CodeBlock, Mono, PrincipalChip, RelativeTime } from '@counterpart/ui';
import { clsx } from 'clsx';

/**
 * What a request is, in the owner's terms: who asked, what they said, and
 * exactly what the runner will do if it is allowed.
 */
export function RequestTitle({ record, className }: { record: Release; className?: string }) {
  const req = record.request;
  if (req.type === 'other') {
    return (
      <span className={clsx('flex items-center gap-2', className)}>
        <Code code="—" />
        <span className="font-semibold text-ink">Outside the menu</span>
      </span>
    );
  }
  const info = EVIDENCE_INFO[req.type];
  return (
    <span className={clsx('flex min-w-0 items-center gap-2', className)}>
      <Code code={info.code} />
      <span className="truncate font-semibold text-ink">
        {info.title}
        {req.type === 'command' ? (
          <>
            {' '}
            <Mono>{req.args.name}</Mono>
          </>
        ) : null}
        {req.type === 'apply-fix' ? (
          <span className="font-normal text-ink-muted"> · {req.args.description}</span>
        ) : null}
      </span>
    </span>
  );
}

export function RequestWho({ record }: { record: Release }) {
  const req = record.request;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
      <PrincipalChip
        name={req.requestedBy.name}
        kind={req.requestedBy.kind}
        side={req.requestedBy.side}
      />
      <span>
        asked <RelativeTime iso={req.createdAt} />
      </span>
      {req.thread ? (
        <a
          href={req.thread}
          target="_blank"
          rel="noreferrer"
          className="text-info underline-offset-2 hover:underline"
        >
          open thread
        </a>
      ) : null}
    </div>
  );
}

export function RequestQuote({ record }: { record: Release }) {
  return (
    <blockquote className="border-l-2 border-line-strong pl-3 text-sm italic text-ink-muted">
      “{record.request.requestText}”
    </blockquote>
  );
}

/** The concrete effect of allowing this request. */
export function RequestEffect({
  record,
  menu,
}: {
  record: Release;
  menu?: Array<{ name: string; run: string[]; verbose: string[]; cwd: string }> | undefined;
}) {
  const req = record.request;
  const row = (label: string, body: React.ReactNode) => (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3 text-sm">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="min-w-0 text-ink">{body}</dd>
    </div>
  );
  switch (req.type) {
    case 'versions':
      return (
        <dl className="space-y-1.5">
          {row(
            'Will read',
            'package manifests and lockfiles, installed package versions, runtime versions',
          )}
          {row(
            'Packages',
            req.args.packages.length
              ? req.args.packages.map((p) => <Mono key={p}>{p}</Mono>)
              : 'everything declared',
          )}
          {row('Runs code', 'no')}
        </dl>
      );
    case 'config':
      return (
        <dl className="space-y-1.5">
          {row(
            'Will read',
            <span className="flex flex-wrap gap-1">
              {req.args.paths.map((p) => (
                <Mono key={p}>{p}</Mono>
              ))}
            </span>,
          )}
          {row(
            'Redaction',
            'dotenv values, keys, tokens, emails, addresses and home paths are removed before release',
          )}
          {row('Runs code', 'no')}
        </dl>
      );
    case 'command': {
      const entry = menu?.find((m) => m.name === req.args.name);
      const argv = entry ? [...entry.run, ...(req.args.verbose ? entry.verbose : [])] : null;
      return (
        <dl className="space-y-1.5">
          {row('Will run', argv ? <Mono>{argv.join(' ')}</Mono> : <Mono>{req.args.name}</Mono>)}
          {row(
            'Where',
            entry ? <Mono>{entry.cwd === '.' ? 'project root' : entry.cwd}</Mono> : 'project root',
          )}
          {row('Shell', 'none; the command runs as an argument list')}
          {row('Output', 'stdout and stderr, truncated to the configured limits, redacted')}
        </dl>
      );
    }
    case 'repro':
      return (
        <dl className="space-y-1.5">
          {row('Will run', `this ${req.args.shell} script, verbatim`)}
          <div>
            <CodeBlock collapsedLines={8} marks={false} label="posted by the helpdesk">
              {req.args.script}
            </CodeBlock>
          </div>
          {row('Where', 'a fresh temporary directory, not your checkout')}
          {row('Network', 'denied by the sandbox')}
          {row('Environment', 'PATH and locale only')}
        </dl>
      );
    case 'diff':
      return (
        <dl className="space-y-1.5">
          {row(
            'Will read',
            `git diff --stat against HEAD and the last ${req.args.commits} commit subjects`,
          )}
          {row(
            'Paths',
            req.args.paths.length
              ? req.args.paths.map((p) => <Mono key={p}>{p}</Mono>)
              : 'whole repository',
          )}
          {row('Runs code', 'git only')}
        </dl>
      );
    case 'apply-fix':
      return (
        <dl className="space-y-1.5">
          {row('Will apply', req.args.description)}
          <div>
            <CodeBlock collapsedLines={12} marks={false} label="unified diff">
              {req.args.patch}
            </CodeBlock>
          </div>
          {row('Then run', <Mono>{req.args.verifyWith}</Mono>)}
          {row('Reversible', 'yes; nothing is committed, revert with git apply -R')}
        </dl>
      );
    case 'other':
      return (
        <dl className="space-y-1.5">
          {row('Asked for', <Mono>{req.args.asked}</Mono>)}
          {row('Runs code', 'no; refused before anything happened')}
        </dl>
      );
  }
}
