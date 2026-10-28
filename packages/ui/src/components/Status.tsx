import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

export type Tone = 'neutral' | 'accent' | 'pending' | 'danger' | 'info';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-muted border-line',
  accent: 'bg-accent-soft text-accent border-accent/30',
  pending: 'bg-pending-soft text-pending border-pending/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  info: 'bg-info-soft text-info border-info/30',
};

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Adds a small dot; `live` makes it pulse. */
  dot?: boolean;
  live?: boolean;
  mono?: boolean;
}

export function Pill({
  tone = 'neutral',
  dot,
  live,
  mono,
  className,
  children,
  ...rest
}: PillProps) {
  return (
    <span
      className={clsx(
        'inline-flex h-5 items-center gap-1.5 rounded-sm border px-1.5 text-2xs font-medium leading-none tracking-wide',
        mono && 'font-mono',
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {dot ? (
        <span
          aria-hidden
          className={clsx('size-1.5 rounded-full bg-current', live && 'animate-pulse-dot')}
        />
      ) : null}
      {children}
    </span>
  );
}

/** The E1…E6 code, always in mono, always the same size. */
export function Code({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex h-5 min-w-7 items-center justify-center rounded-sm border border-line bg-surface px-1 font-mono text-2xs font-medium text-ink',
        className,
      )}
    >
      {code}
    </span>
  );
}

export type RecordStatus =
  | 'pending'
  | 'collecting'
  | 'released'
  | 'declined'
  | 'refused'
  | 'failed'
  | 'expired';

export const RECORD_STATUS_TONE: Record<RecordStatus, Tone> = {
  pending: 'pending',
  collecting: 'info',
  released: 'accent',
  declined: 'danger',
  refused: 'danger',
  failed: 'danger',
  expired: 'neutral',
};

export const RECORD_STATUS_LABEL: Record<RecordStatus, string> = {
  pending: 'Waiting for you',
  collecting: 'Collecting',
  released: 'Released',
  declined: 'Declined',
  refused: 'Refused',
  failed: 'Failed',
  expired: 'Expired',
};

export function RecordStatusPill({
  status,
  className,
}: {
  status: RecordStatus;
  className?: string;
}) {
  return (
    <Pill
      tone={RECORD_STATUS_TONE[status]}
      dot
      live={status === 'pending' || status === 'collecting'}
      className={className}
    >
      {RECORD_STATUS_LABEL[status]}
    </Pill>
  );
}
