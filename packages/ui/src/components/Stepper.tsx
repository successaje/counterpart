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
  className?: string;
}

/**
 * Horizontal progress through case states. On narrow screens only the
 * current step and its neighbours are labelled.
 */
export function Stepper({ steps, current, aside, className }: StepperProps) {
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <ol className={clsx('flex items-center gap-1 sm:gap-2', className)} aria-label="Case progress">
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
                active && !aside && 'bg-ink ring-4 ring-ink/10',
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
                'truncate text-xs',
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
