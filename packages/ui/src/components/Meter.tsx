import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import type { Tone } from './Status.js';

export const TONE_FILL: Record<Tone, string> = {
  neutral: 'bg-line-strong',
  accent: 'bg-accent',
  pending: 'bg-pending',
  danger: 'bg-danger',
  info: 'bg-info',
};

export interface Segment {
  id: string;
  label: string;
  value: number;
  tone: Tone;
}

function describe(segments: readonly Segment[]): string {
  const parts = segments.filter((s) => s.value > 0).map((s) => `${s.value} ${s.label}`);
  return parts.length ? parts.join(', ') : 'nothing yet';
}

/**
 * One bar, split by outcome. Widths are proportional; a non-zero segment is
 * never thinner than a few pixels so a single refusal among a hundred
 * releases still shows.
 */
export function StackedBar({
  segments,
  legend = true,
  size = 'md',
  empty = 'nothing yet',
  className,
  'aria-label': ariaLabel,
}: {
  segments: readonly Segment[];
  legend?: boolean;
  size?: 'sm' | 'md';
  empty?: string;
  className?: string;
  'aria-label'?: string;
}) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  return (
    <div className={clsx('space-y-2', className)}>
      <div
        role="img"
        aria-label={ariaLabel ?? describe(segments)}
        className={clsx(
          'flex w-full gap-px overflow-hidden rounded-sm bg-sunken',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
        )}
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span
              key={s.id}
              className={clsx('h-full transition-[flex-basis] duration-300', TONE_FILL[s.tone])}
              style={{ flex: `${s.value} ${s.value} 0%`, minWidth: 3 }}
            />
          ))}
      </div>
      {legend ? (
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {total === 0 ? (
            <span className="text-ink-faint">{empty}</span>
          ) : (
            segments.map((s) => (
              <div
                key={s.id}
                className={clsx('flex items-center gap-1.5', s.value === 0 && 'opacity-50')}
              >
                <span aria-hidden className={clsx('size-1.5 rounded-full', TONE_FILL[s.tone])} />
                <dt className="text-ink-muted">{s.label}</dt>
                <dd className="font-mono tabular-nums text-ink">{s.value}</dd>
              </div>
            ))
          )}
        </dl>
      ) : null}
    </div>
  );
}

export interface BarItem {
  id: string;
  label: ReactNode;
  value: number;
  tone?: Tone;
  /** Shown after the value, faint: "of 7", "left", a percentage. */
  hint?: ReactNode;
}

/**
 * Horizontal bars with a label and a count, for a handful of categories
 * (redactions by kind, requests by evidence type). Bars are relative to the
 * largest item unless `max` is given.
 */
export function BarList({
  items,
  max,
  empty = 'nothing yet',
  className,
}: {
  items: readonly BarItem[];
  max?: number;
  empty?: string;
  className?: string;
}) {
  const top = max ?? Math.max(0, ...items.map((i) => i.value));
  if (items.length === 0 || top === 0) {
    return <p className={clsx('text-xs text-ink-faint', className)}>{empty}</p>;
  }
  return (
    <ul className={clsx('space-y-1.5', className)}>
      {items.map((i) => (
        <li
          key={i.id}
          className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_auto] items-center gap-2 text-xs"
        >
          <span className="truncate text-ink-muted">{i.label}</span>
          <span className="h-1.5 overflow-hidden rounded-sm bg-sunken">
            <span
              className={clsx(
                'block h-full rounded-sm transition-[width] duration-300',
                TONE_FILL[i.tone ?? 'neutral'],
              )}
              style={{ width: `${(i.value / top) * 100}%` }}
            />
          </span>
          <span className="font-mono tabular-nums text-ink">
            {i.value}
            {i.hint ? <span className="font-sans text-ink-faint"> {i.hint}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
