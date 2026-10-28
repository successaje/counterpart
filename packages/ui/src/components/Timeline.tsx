import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Pill, type Tone } from './Status.js';
import { durationLabel, RelativeTime } from './Time.js';

const DOT: Record<Tone, string> = {
  neutral: 'bg-line-strong ring-line',
  accent: 'bg-accent ring-accent/30',
  pending: 'bg-pending ring-pending/30',
  danger: 'bg-danger ring-danger/30',
  info: 'bg-info ring-info/30',
};

export interface TimelineEntry {
  id: string;
  /** ISO timestamp. Entries are rendered in the order given. */
  at: string;
  tone: Tone;
  title: ReactNode;
  detail?: ReactNode;
  by?: string | undefined;
  /** The moment something left the machine. */
  crossed?: boolean;
}

/**
 * A vertical rail of moments. Gaps of a minute or more are called out so a
 * five-second collection and a two-hour wait for the owner read differently.
 */
export function Timeline({
  entries,
  className,
}: {
  entries: readonly TimelineEntry[];
  className?: string;
}) {
  return (
    <ol className={clsx('relative', className)} aria-label="Timeline">
      {entries.map((e, i) => {
        const prev = entries[i - 1];
        const gap = prev ? Date.parse(e.at) - Date.parse(prev.at) : 0;
        const last = i === entries.length - 1;
        return (
          <li key={e.id} className={clsx('relative flex gap-3', !last && 'pb-4')}>
            {!last ? (
              <span aria-hidden className="absolute bottom-0 left-[5px] top-3 w-px bg-line" />
            ) : null}
            <span
              aria-hidden
              className={clsx(
                'relative z-[1] mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-surface ring-1',
                DOT[e.tone],
              )}
            />
            <div className="min-w-0 flex-1">
              {gap >= 60_000 ? (
                <div className="mb-1 text-2xs text-ink-faint">{durationLabel(gap)} later</div>
              ) : null}
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                <span className="text-ink">{e.title}</span>
                {e.by ? <span className="text-xs text-ink-muted">by {e.by}</span> : null}
                {e.crossed ? <Pill tone="accent">left this machine</Pill> : null}
                <RelativeTime iso={e.at} className="ml-auto text-xs text-ink-faint" />
              </div>
              {e.detail ? <div className="mt-0.5 text-sm text-ink-muted">{e.detail}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
