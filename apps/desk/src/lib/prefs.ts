/**
 * Per-browser preferences. Each one is a convenience, never state the ledger
 * depends on, so a blocked or cleared localStorage only resets a choice.
 */

export type Theme = 'system' | 'light' | 'dark';
const THEME_KEY = 'counterpart.desk.theme';
const NOTIFY_KEY = 'counterpart.desk.notify';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // private window or blocked storage: the choice lasts for this page only
  }
}

export function getTheme(): Theme {
  const v = read(THEME_KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

/** Sets `data-theme` on the root; `system` removes it so the media query decides. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function setTheme(theme: Theme): void {
  write(THEME_KEY, theme === 'system' ? null : theme);
  applyTheme(theme);
}

export function getNotify(): boolean {
  return read(NOTIFY_KEY) === 'on';
}

export function setNotify(on: boolean): void {
  write(NOTIFY_KEY, on ? 'on' : null);
}
