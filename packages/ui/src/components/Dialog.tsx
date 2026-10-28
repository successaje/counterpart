import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';
import { Button } from './Button.js';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

/**
 * Native <dialog>, so focus trapping, Escape and the top layer come from the
 * browser. Clicking the backdrop closes.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the native dialog already closes on Escape; this click only handles the backdrop.
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={clsx(
        'm-auto w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-0 text-ink shadow-raised backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]',
        'open:animate-enter',
        sizes[size],
      )}
    >
      <div className="flex items-start justify-between gap-4 p-5 pb-0">
        <div>
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Close"
          onClick={onClose}
          icon={<X />}
          className="-mr-2 -mt-1"
        />
      </div>
      <div className="p-5">{children}</div>
      {footer ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
