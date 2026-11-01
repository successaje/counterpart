import { useToast } from '@counterpart/ui';
import { clsx } from 'clsx';
import { Bell, BellOff, Monitor, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { getNotify, getTheme, setNotify, setTheme, type Theme } from '../lib/prefs.js';

const THEMES: Array<{ id: Theme; label: string; icon: typeof Sun }> = [
  { id: 'system', label: 'Follow the system', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
];

export function ThemeToggle() {
  const [theme, set] = useState<Theme>(() => getTheme());
  return (
    <fieldset className="inline-flex rounded-md border border-line bg-surface p-0.5">
      <legend className="sr-only">Theme</legend>
      {THEMES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={theme === id}
          aria-label={label}
          title={label}
          onClick={() => {
            setTheme(id);
            set(id);
          }}
          className={clsx(
            'rounded-sm p-1 transition-colors',
            theme === id ? 'bg-sunken text-ink' : 'text-ink-faint hover:text-ink',
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </fieldset>
  );
}

/**
 * Desktop notifications for requests that arrive while the tab is in the
 * background. Asks the browser once, on the first switch-on.
 */
export function NotifyToggle() {
  const toast = useToast();
  const supported = typeof Notification !== 'undefined';
  const [on, setOn] = useState(() => supported && getNotify());
  if (!supported) return null;

  const toggle = async () => {
    if (on) {
      setNotify(false);
      setOn(false);
      return;
    }
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission().catch(() => 'denied' as const);
    if (permission !== 'granted') {
      toast.push({
        title: 'Notifications are blocked',
        body: 'Allow them for this site in the browser, then switch this on again.',
        tone: 'pending',
      });
      return;
    }
    setNotify(true);
    setOn(true);
    toast.push({
      title: 'You will be told when a request arrives',
      body: 'Only while this tab is in the background.',
      tone: 'neutral',
    });
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={on}
      title={on ? 'Stop desktop notifications' : 'Notify me when a request arrives'}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-1.5 py-1 text-2xs transition-colors',
        on ? 'text-ink' : 'text-ink-faint hover:text-ink',
      )}
    >
      {on ? (
        <Bell className="size-3.5" aria-hidden />
      ) : (
        <BellOff className="size-3.5" aria-hidden />
      )}
      {on ? 'notifying' : 'notify me'}
    </button>
  );
}
