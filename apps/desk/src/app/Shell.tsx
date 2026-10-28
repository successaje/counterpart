import { Pill, ToastProvider, Wordmark } from '@counterpart/ui';
import { clsx } from 'clsx';
import { BookOpen, FolderOpen, Inbox, ListChecks } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { selectPending } from '../lib/state.js';
import { DeskProvider, useDesk } from '../lib/store.js';
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
  const { state } = useDesk();
  const map = {
    connecting: { tone: 'neutral', label: 'connecting' },
    live: { tone: 'accent', label: 'live' },
    offline: { tone: 'danger', label: 'server unreachable' },
    unauthorized: { tone: 'pending', label: 'not connected' },
  } as const;
  const m = map[state.connection];
  return (
    <Pill tone={m.tone} dot live={state.connection === 'live' || state.connection === 'connecting'}>
      {m.label}
    </Pill>
  );
}

function Frame() {
  const { state } = useDesk();
  const pending = selectPending(state).length;
  const project = state.info?.project.name;

  return (
    <div className="min-h-dvh bg-paper text-ink">
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
        <div className="mt-auto space-y-2 text-xs text-ink-faint">
          <ConnectionDot />
          <p className="font-mono">v{state.info?.version ?? '—'}</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/85 px-4 py-3 backdrop-blur md:hidden">
        <Wordmark />
        <ConnectionDot />
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-5 md:pl-64 md:pr-8 md:pt-8 lg:pl-72">
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
