import { Button, Kbd, Pill, ToastProvider, Wordmark } from '@counterpart/ui';
import { clsx } from 'clsx';
import { BookOpen, FolderOpen, Inbox, ListChecks, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { NotifyToggle, ThemeToggle } from '../components/Preferences.js';
import { ShortcutSheet } from '../components/ShortcutSheet.js';
import { getNotify } from '../lib/prefs.js';
import { useShortcuts } from '../lib/shortcuts.js';
import { selectPending } from '../lib/state.js';
import { DeskProvider, useDesk } from '../lib/store.js';
import { requestLabel } from '../lib/timeline.js';
import { Connect } from '../screens/Connect.js';

const NAV = [
  { to: '/', label: 'Now', icon: Inbox, end: true },
  { to: '/cases', label: 'Cases', icon: FolderOpen, end: false },
  { to: '/ledger', label: 'Ledger', icon: BookOpen, end: false },
  { to: '/menu', label: 'Menu', icon: ListChecks, end: false },
];

export function Shell() {
  return (
    <ToastProvider>
      <DeskProvider>
        <Frame />
      </DeskProvider>
    </ToastProvider>
  );
}

function ConnectionDot() {
  const { state, reconnect } = useDesk();
  const map = {
    connecting: { tone: 'neutral', label: 'connecting' },
    live: { tone: 'accent', label: 'live' },
    offline: { tone: 'danger', label: 'reconnecting' },
    unauthorized: { tone: 'pending', label: 'not connected' },
  } as const;
  const m = map[state.connection];
  return (
    <span className="inline-flex items-center gap-1.5">
      <Pill tone={m.tone} dot live={state.connection !== 'unauthorized'}>
        {m.label}
      </Pill>
      {state.connection === 'offline' ? (
        <Button
          size="sm"
          variant="ghost"
          icon={<RefreshCw />}
          aria-label="Try to reconnect now"
          title="The browser retries on its own; this retries now"
          onClick={reconnect}
        />
      ) : null}
    </span>
  );
}

/** Tab title carries the count, so a background tab still says what is waiting. */
function useTitleBadge(pending: number) {
  useEffect(() => {
    document.title = pending > 0 ? `(${pending}) Counterpart Desk` : 'Counterpart Desk';
  }, [pending]);
}

/**
 * A desktop notification for each request that arrives while the tab is in
 * the background, when the owner switched them on.
 */
function useArrivalNotifications() {
  const { state } = useDesk();
  const latest = state.arrivals[0];
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (!latest || seen.current === latest) return;
    seen.current = latest;
    if (!getNotify() || !document.hidden || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    const r = state.records[latest];
    if (!r) return;
    const n = new Notification(`Waiting for you: ${requestLabel(r)}`, {
      body: `${r.request.requestedBy.name}: “${r.request.requestText}”`,
      tag: latest,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  }, [latest, state.records]);
}

function Frame() {
  const { state } = useDesk();
  const pending = selectPending(state).length;
  const project = state.info?.project.name;
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(false);
  useTitleBadge(state.connection === 'unauthorized' ? 0 : pending);
  useArrivalNotifications();
  useShortcuts({
    'g n': () => navigate('/'),
    'g c': () => navigate('/cases'),
    'g l': () => navigate('/ledger'),
    'g m': () => navigate('/menu'),
    '?': () => setSheet(true),
  });

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-surface px-3 py-2 text-sm text-ink shadow-raised focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-line bg-surface/70 px-4 py-5 backdrop-blur md:flex">
        <Wordmark />
        <div className="mt-1 truncate pl-8 font-mono text-xs text-ink-faint">{project ?? '…'}</div>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Primary">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-sunken font-medium text-ink'
                    : 'text-ink-muted hover:bg-sunken/60 hover:text-ink',
                )
              }
            >
              <Icon className="size-4" aria-hidden />
              <span className="flex-1">{label}</span>
              {label === 'Now' && pending > 0 ? (
                <span className="rounded-sm bg-pending px-1.5 font-mono text-2xs font-semibold text-paper">
                  {pending}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3 text-xs text-ink-faint">
          <ConnectionDot />
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <NotifyToggle />
          </div>
          <div className="flex items-center justify-between">
            <p className="font-mono">v{state.info?.version ?? '—'}</p>
            <button
              type="button"
              onClick={() => setSheet(true)}
              className="inline-flex items-center gap-1 text-ink-faint hover:text-ink"
              aria-label="Keyboard shortcuts"
            >
              <Kbd>?</Kbd> shortcuts
            </button>
          </div>
        </div>
      </aside>
      <ShortcutSheet open={sheet} onClose={() => setSheet(false)} />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/85 px-4 py-3 backdrop-blur md:hidden">
        <Wordmark />
        <ConnectionDot />
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-5xl px-4 pb-24 pt-5 md:pl-64 md:pr-8 md:pt-8 lg:pl-72"
      >
        {state.connection === 'unauthorized' ? <Connect /> : <Outlet />}
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Primary"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-2xs transition-colors',
                isActive ? 'text-ink' : 'text-ink-faint',
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {label}
            {label === 'Now' && pending > 0 ? (
              <span
                className="absolute right-[calc(50%-18px)] top-1.5 size-2 rounded-full bg-pending"
                aria-hidden
              />
            ) : null}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
