import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'solid' | 'outline' | 'ghost';
export type ButtonTone = 'neutral' | 'accent' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  /** Shows a working indicator and disables the button. */
  busy?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium select-none rounded-md border transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-50';

const sizes: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-base',
};

const styles: Record<ButtonVariant, Record<ButtonTone, string>> = {
  solid: {
    neutral: 'bg-ink text-paper border-ink hover:bg-ink/90',
    accent: 'bg-accent text-accent-ink border-accent hover:brightness-105',
    danger: 'bg-danger text-paper border-danger hover:brightness-105',
  },
  outline: {
    neutral: 'bg-surface text-ink border-line-strong hover:bg-sunken',
    accent: 'bg-surface text-accent border-accent/50 hover:bg-accent-soft',
    danger: 'bg-surface text-danger border-danger/50 hover:bg-danger-soft',
  },
  ghost: {
    neutral: 'bg-transparent text-ink-muted border-transparent hover:bg-sunken hover:text-ink',
    accent: 'bg-transparent text-accent border-transparent hover:bg-accent-soft',
    danger: 'bg-transparent text-danger border-transparent hover:bg-danger-soft',
  },
};

export function Button({
  variant = 'outline',
  tone = 'neutral',
  size = 'md',
  busy = false,
  icon,
  iconRight,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        base,
        sizes[size],
        styles[variant][tone],
        busy && 'relative overflow-hidden',
        className,
      )}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 w-1/3 animate-working bg-current/60"
        />
      ) : null}
      {icon ? <span className="-ml-0.5 inline-flex shrink-0 [&>svg]:size-4">{icon}</span> : null}
      {children}
      {iconRight ? (
        <span className="-mr-0.5 inline-flex shrink-0 [&>svg]:size-4">{iconRight}</span>
      ) : null}
    </button>
  );
}
