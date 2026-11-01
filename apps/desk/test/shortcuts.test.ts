import { describe, expect, it, vi } from 'vitest';
import { applyTheme, getTheme, setTheme } from '../src/lib/prefs.js';
import { matchShortcut } from '../src/lib/shortcuts.js';

describe('matchShortcut', () => {
  const allow = vi.fn();
  const now = vi.fn();
  const bindings = { a: allow, 'g n': now };

  it('fires a single key at once', () => {
    const r = matchShortcut(bindings, 'a', null);
    expect(r.fire).toBe(allow);
    expect(r.prefix).toBeNull();
  });

  it('waits for the second key of a sequence', () => {
    const first = matchShortcut(bindings, 'g', null);
    expect(first.fire).toBeUndefined();
    expect(first.prefix).toBe('g');
    const second = matchShortcut(bindings, 'n', first.prefix);
    expect(second.fire).toBe(now);
    expect(second.prefix).toBeNull();
  });

  it('drops a sequence that does not complete', () => {
    const r = matchShortcut(bindings, 'x', 'g');
    expect(r.fire).toBeUndefined();
    expect(r.prefix).toBeNull();
  });

  it('ignores keys with no binding', () => {
    expect(matchShortcut(bindings, 'z', null)).toEqual({ prefix: null });
  });
});

describe('theme preference', () => {
  it('round-trips through storage and the root attribute', () => {
    setTheme('dark');
    expect(getTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    setTheme('system');
    expect(getTheme()).toBe('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
