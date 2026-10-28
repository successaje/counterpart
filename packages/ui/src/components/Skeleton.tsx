import { clsx } from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx('animate-pulse rounded-sm bg-sunken', className)} />;
}

export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ['w-11/12', 'w-2/3', 'w-5/6', 'w-1/2', 'w-3/4'];
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows.
        <Skeleton key={i} className={clsx('h-3', widths[i % widths.length])} />
      ))}
    </div>
  );
}
