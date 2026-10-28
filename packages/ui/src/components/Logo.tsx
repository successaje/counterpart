import { clsx } from 'clsx';

/**
 * Two halves that meet: the reporter's side and the project's side. The gap
 * is the room between them.
 */
export function Mark({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={clsx('shrink-0', className)}
    >
      <path d="M11 3a9 9 0 0 0 0 18V3Z" fill="currentColor" />
      <path d="M13 3a9 9 0 0 1 0 18V3Z" className="fill-accent" />
    </svg>
  );
}

export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2 text-ink', className)}>
      <Mark size={22} />
      {compact ? null : (
        <span className="text-[15px] font-semibold tracking-tight">Counterpart</span>
      )}
    </span>
  );
}
