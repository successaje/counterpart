import { clsx } from 'clsx';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Tone } from './Status.js';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: Tone;
}

interface ToastApi {
  push(t: Omit<Toast, 'id'>): void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}

const rule: Record<Tone, string> = {
  neutral: 'border-l-line-strong',
  accent: 'border-l-accent',
  pending: 'border-l-pending',
  danger: 'border-l-danger',
  info: 'border-l-info',
};

export function ToastProvider({ children, ttlMs = 5000 }: { children: ReactNode; ttlMs?: number }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = ++seq.current;
      setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
      setTimeout(() => dismiss(id), ttlMs);
    },
    [dismiss, ttlMs],
  );

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={clsx(
              'pointer-events-auto w-full max-w-sm animate-enter rounded-md border border-line border-l-2 bg-surface p-3 text-left shadow-raised',
              rule[t.tone ?? 'neutral'],
            )}
          >
            <div className="text-sm font-medium text-ink">{t.title}</div>
            {t.body ? <div className="mt-0.5 text-xs text-ink-muted">{t.body}</div> : null}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
