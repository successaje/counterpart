import { clsx } from 'clsx';

export interface Step {
  id: string;
  label: string;
}

export interface StepperProps {
  steps: readonly Step[];
  current: string;
  /** Marks the flow as parked on a side state (e.g. needs-human). */
  aside?: { label: string; tone: 'pending' | 'danger' } | null;
  /** Colour of the current step. `ink` is a settled position; the others say what kind of wait it is. */
  tone?: 'ink' | 'pending' | 'info' | 'accent';
  /** Pulses the current step: something is happening or someone is being waited on. */
  live?: boolean;
  /** Accessible name of the list. */
  label?: string;
  className?: string;
}

const ACTIVE: Record<NonNullable<StepperProps['tone']>, string> = {
  ink: 'bg-ink ring-4 ring-ink/10',
  pending: 'bg-pending ring-4 ring-pending/15',
  info: 'bg-info ring-4 ring-info/15',
  accent: 'bg-accent ring-4 ring-accent/15',
};

/**
 * Horizontal progress through case states. On narrow screens only the
 * current step and its neighbours are labelled.
 */
export function Stepper({
  steps,
  current,
  aside,
  tone = 'ink',
  live = false,
  label = 'Case progress',
  className,
}: StepperProps) {
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <ol
      className={clsx('flex flex-wrap items-center gap-x-1 gap-y-2 sm:gap-x-2', className)}
      aria-label={label}
    >
      {steps.map((s, i) => {
        const done = idx > i;
        const active = idx === i;
        const near = Math.abs(i - idx) <= 1;
        return (
          <li
            key={s.id}
            className="flex min-w-0 items-center gap-1 sm:gap-2"
            aria-current={active ? 'step' : undefined}
          >
            <span
              className={clsx(
                'size-2 shrink-0 rounded-full transition-colors duration-200',
                done && 'bg-accent',
                active && !aside && ACTIVE[tone],
                active && live && 'animate-pulse-dot',
                active &&
                  aside &&
                  (aside.tone === 'danger'
                    ? 'bg-danger ring-4 ring-danger/15'
                    : 'bg-pending ring-4 ring-pending/15'),
                !done && !active && 'bg-line-strong',
              )}
            />
            <span
              className={clsx(
                'whitespace-nowrap text-xs',
                active ? 'font-medium text-ink' : done ? 'text-ink-muted' : 'text-ink-faint',
                !near && 'hidden sm:inline',
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 ? (
              <span
                className={clsx('h-px w-3 shrink-0 sm:w-5', done ? 'bg-accent' : 'bg-line-strong')}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
      {aside ? (
        <li
          className={clsx(
            'ml-1 text-xs font-medium',
            aside.tone === 'danger' ? 'text-danger' : 'text-pending',
          )}
        >
          · {aside.label}
        </li>
      ) : null}
    </ol>
  );
}
