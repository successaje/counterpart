import type { Payload } from '@counterpart/protocol';
import { CodeBlock, Mono, Pill } from '@counterpart/ui';

function OutputMeta({
  o,
}: {
  o: { exitCode: number | null; durationMs: number; truncated: boolean; timedOut: boolean };
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Pill tone={o.exitCode === 0 ? 'accent' : o.exitCode === null ? 'neutral' : 'danger'} mono>
        exit {o.exitCode ?? 'none'}
      </Pill>
      <Pill mono>{(o.durationMs / 1000).toFixed(1)}s</Pill>
      {o.timedOut ? <Pill tone="danger">timed out</Pill> : null}
      {o.truncated ? <Pill tone="pending">truncated</Pill> : null}
    </div>
  );
}

function Output({ o, marks }: { o: { stdout: string; stderr: string }; marks: boolean }) {
  return (
    <div className="space-y-2">
      {o.stdout.trim() ? (
        <CodeBlock label="stdout" marks={marks}>
          {o.stdout}
        </CodeBlock>
      ) : null}
      {o.stderr.trim() ? (
        <CodeBlock label="stderr" marks={marks}>
          {o.stderr}
        </CodeBlock>
      ) : null}
      {!o.stdout.trim() && !o.stderr.trim() ? (
        <p className="text-xs text-ink-faint">no output</p>
      ) : null}
    </div>
  );
}

/**
 * Renders any payload. `marks` highlights redaction tokens, which only make
 * sense on the released side.
 */
export function PayloadView({ payload, marks = true }: { payload: Payload; marks?: boolean }) {
  switch (payload.type) {
    case 'versions':
      return (
        <div className="space-y-3 text-sm">
          <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1">
            <dt className="text-ink-faint">Platform</dt>
            <dd className="font-mono text-xs">{payload.platform}</dd>
            <dt className="text-ink-faint">Runtime</dt>
            <dd className="font-mono text-xs">
              {Object.entries(payload.runtime)
                .map(([k, v]) => `${k} ${v}`)
                .join(' · ') || 'unknown'}
            </dd>
            <dt className="text-ink-faint">Package manager</dt>
            <dd className="font-mono text-xs">{payload.packageManager ?? 'none detected'}</dd>
          </dl>
          {payload.packages.length ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-ink-faint">
                  <th className="pb-1 font-medium">Package</th>
                  <th className="pb-1 font-medium">Version</th>
                  <th className="pb-1 font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {payload.packages.map((p) => (
                  <tr key={p.name} className="border-t border-line">
                    <td className="py-1 pr-3">{p.name}</td>
                    <td className="py-1 pr-3">{p.version}</td>
                    <td className="py-1 text-ink-muted">{p.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-ink-faint">no packages reported</p>
          )}
        </div>
      );
    case 'config':
      return (
        <div className="space-y-3">
          {payload.files.map((f) => (
            <CodeBlock
              key={f.path}
              label={`${f.path} · ${f.bytes} bytes${f.truncated ? ' · truncated' : ''}`}
              marks={marks}
            >
              {f.content}
            </CodeBlock>
          ))}
        </div>
      );
    case 'command':
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Mono className="text-xs">$ {payload.argv.join(' ')}</Mono>
            <OutputMeta o={payload.output} />
          </div>
          <Output o={payload.output} marks={marks} />
        </div>
      );
    case 'repro':
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
            <span>
              {payload.shell} · {payload.sandbox}
            </span>
            <OutputMeta o={payload.output} />
          </div>
          <CodeBlock label="script" marks={false} collapsedLines={8}>
            {payload.script}
          </CodeBlock>
          <Output o={payload.output} marks={marks} />
        </div>
      );
    case 'diff':
      return (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span>{payload.paths.length ? payload.paths.join(', ') : 'whole repository'}</span>
            <Pill tone={payload.dirty ? 'pending' : 'accent'}>
              {payload.dirty ? 'uncommitted changes' : 'clean tree'}
            </Pill>
          </div>
          <CodeBlock label="git diff --stat HEAD" marks={marks}>
            {payload.stat}
          </CodeBlock>
          {payload.commits.length ? (
            <ul className="space-y-1 font-mono text-xs">
              {payload.commits.map((c) => (
                <li key={c.sha} className="flex gap-3">
                  <span className="text-ink-faint">{c.sha}</span>
                  <span className="w-20 shrink-0 text-ink-faint">{c.when}</span>
                  <span className="truncate">{c.subject}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    case 'apply-fix':
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink">{payload.description}</span>
            <Pill tone={payload.applied ? 'accent' : 'danger'}>
              {payload.applied ? 'applied' : 'not applied'}
            </Pill>
          </div>
          <p className="text-xs text-ink-muted">{payload.applyOutput}</p>
          <CodeBlock label="patch" marks={false} collapsedLines={10}>
            {payload.patch}
          </CodeBlock>
          {payload.verify ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-ink-muted">
                  verified with <Mono>{payload.verify.name}</Mono>
                </span>
                <OutputMeta o={payload.verify.output} />
              </div>
              <Output o={payload.verify.output} marks={marks} />
            </div>
          ) : null}
        </div>
      );
  }
}
