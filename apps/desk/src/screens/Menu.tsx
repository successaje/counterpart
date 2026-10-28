import { Card, Code, Mono, Pill, Section, SkeletonLines } from '@counterpart/ui';
import { useDesk } from '../lib/store.js';
import { Page } from './Page.js';

export function Menu() {
  const { state } = useDesk();
  const info = state.info;
  if (!info) {
    return (
      <Page title="Menu">
        <SkeletonLines lines={5} />
      </Page>
    );
  }
  return (
    <Page
      title="Menu"
      lede={
        <>
          What this project lets a helpdesk ask for. Edit <Mono>.counterpart/runner.yaml</Mono> to
          change it; the server picks the file up on restart.
        </>
      }
    >
      <Section
        title="Evidence types"
        description="Six things a helpdesk may request. Anything else is refused."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {info.evidence.map((e) => (
            <Card key={e.type} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  <Code code={e.code} /> {e.title}
                </span>
                <Pill tone={info.approvals[e.type] === 'ask' ? 'pending' : 'accent'}>
                  {info.approvals[e.type] === 'ask' ? 'asks you' : 'automatic'}
                </Pill>
              </div>
              <p className="text-sm text-ink-muted">{e.summary}</p>
              <div className="flex gap-1.5 text-2xs">
                <Pill tone={e.executes ? 'pending' : 'neutral'}>
                  {e.executes ? 'runs code' : 'read only'}
                </Pill>
                {e.mutates ? <Pill tone="danger">changes files</Pill> : null}
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        title="Commands"
        description="E3 may run exactly these, and E6 may verify with them."
      >
        <Card padded={false}>
          <ul className="divide-y divide-line">
            {info.menu.map((m) => (
              <li
                key={m.name}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4 sm:px-5"
              >
                <div>
                  <Mono>{m.name}</Mono>
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm text-ink">{m.description}</p>
                  <p className="truncate font-mono text-xs text-ink-muted">
                    $ {m.run.join(' ')}
                    {m.verbose.length ? (
                      <span className="text-ink-faint"> [{m.verbose.join(' ')}]</span>
                    ) : null}
                    {m.cwd !== '.' ? <span className="text-ink-faint"> · in {m.cwd}</span> : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Readable config"
          description="E2 may read files matching these patterns. Values in dotenv files are always removed."
        >
          {info.configPaths.length ? (
            <div className="flex flex-wrap gap-1.5">
              {info.configPaths.map((p) => (
                <Mono key={p}>{p}</Mono>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-faint">None. Every E2 request is refused.</p>
          )}
        </Section>

        <Section title="Limits and sandbox">
          <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-ink-faint">Command timeout</dt>
            <dd className="font-mono text-xs">{info.limits.timeoutMs / 1000}s</dd>
            <dt className="text-ink-faint">Output limit</dt>
            <dd className="font-mono text-xs">
              {info.limits.maxLines} lines · {Math.round(info.limits.maxBytes / 1024)} KiB
            </dd>
            <dt className="text-ink-faint">Approval window</dt>
            <dd className="font-mono text-xs">
              {Math.round(info.limits.approvalWaitMs / 60000)} min
            </dd>
            <dt className="text-ink-faint">Network sandbox</dt>
            <dd className="text-xs">
              {info.sandbox.available ? (
                <span className="font-mono">{info.sandbox.adapter}</span>
              ) : (
                <span className="text-danger">
                  unavailable: {info.sandbox.reason}. E4 requests are refused.
                </span>
              )}
            </dd>
            <dt className="text-ink-faint">Project root</dt>
            <dd className="truncate font-mono text-xs">{info.projectRoot}</dd>
          </dl>
        </Section>
      </div>
    </Page>
  );
}
