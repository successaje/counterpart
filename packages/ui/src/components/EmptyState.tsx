import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-start gap-2 rounded-lg border border-dashed border-line-strong p-5 sm:p-6',
        className,
      )}
    >
      {icon ? <div className="mb-1 text-ink-faint [&>svg]:size-5">{icon}</div> : null}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {body ? <div className="max-w-prose text-sm text-ink-muted">{body}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
