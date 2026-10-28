import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Draws attention: a left rule in the given tone. */
  rule?: 'accent' | 'pending' | 'danger' | 'info';
  padded?: boolean;
  interactive?: boolean;
}

const rules = {
  accent: 'border-l-2 border-l-accent',
  pending: 'border-l-2 border-l-pending',
  danger: 'border-l-2 border-l-danger',
  info: 'border-l-2 border-l-info',
};

export function Card({
  rule,
  padded = true,
  interactive,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border border-line bg-surface shadow-card',
        padded && 'p-4 sm:p-5',
        rule && rules[rule],
        interactive && 'transition-colors duration-150 hover:border-line-strong',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  meta,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0 flex-1">
        {meta ? <div className="mb-1 flex flex-wrap items-center gap-2">{meta}</div> : null}
        <h3 className="text-base font-semibold leading-snug text-ink">{title}</h3>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('space-y-3', className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-ink-faint">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
