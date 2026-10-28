import { clsx } from 'clsx';
import { Bot, User } from 'lucide-react';

export interface PrincipalChipProps {
  name: string;
  kind: 'agent' | 'human';
  side: 'reporter' | 'project';
  className?: string;
}

/** Who did something: an agent or a person, on your side or theirs. */
export function PrincipalChip({ name, kind, side, className }: PrincipalChipProps) {
  const Icon = kind === 'agent' ? Bot : User;
  return (
    <span
      className={clsx(
        'inline-flex h-6 max-w-full items-center gap-1.5 rounded-sm border px-1.5 text-xs',
        side === 'project'
          ? 'border-info/30 bg-info-soft text-info'
          : 'border-line bg-sunken text-ink-muted',
        className,
      )}
      title={`${kind} on the ${side} side`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate font-medium">{name}</span>
    </span>
  );
}
