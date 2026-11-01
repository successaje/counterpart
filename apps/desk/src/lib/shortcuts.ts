import { useEffect, useRef } from 'react';

/**
 * Keyboard shortcuts: single keys (`a`, `?`) and two-key sequences (`g n`).
 * Ignored while typing in a field or while a dialog is open, so a shortcut
 * never fires from inside a decline note. Sequences wait one second for
 * the second key.
 */

export type Bindings = Record<string, () => void>;

const SEQUENCE_MS = 1000;

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    target.closest('dialog[open]') !== null
  );
}

/** Pure matcher so the sequence logic can be tested without a DOM. */
export function matchShortcut(
  bindings: Bindings,
  key: string,
  pendingPrefix: string | null,
): { fire?: () => void; prefix: string | null } {
  if (pendingPrefix) {
    const combo = `${pendingPrefix} ${key}`;
    const fn = bindings[combo];
    return fn ? { fire: fn, prefix: null } : { prefix: null };
  }
  if (Object.keys(bindings).some((k) => k.startsWith(`${key} `))) return { prefix: key };
  const fn = bindings[key];
  return fn ? { fire: fn, prefix: null } : { prefix: null };
}

export function useShortcuts(bindings: Bindings, enabled = true): void {
  const ref = useRef(bindings);
  ref.current = bindings;
  useEffect(() => {
    if (!enabled) return;
    let prefix: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (document.querySelector('dialog[open]')) return;
      const { fire, prefix: next } = matchShortcut(ref.current, e.key, prefix);
      if (timer) clearTimeout(timer);
      prefix = next;
      if (next) timer = setTimeout(() => (prefix = null), SEQUENCE_MS);
      if (fire) {
        e.preventDefault();
        fire();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);
}
