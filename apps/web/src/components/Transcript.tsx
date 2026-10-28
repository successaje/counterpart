import { Mark } from '@counterpart/ui';
import { clsx } from 'clsx';
import { Bot } from 'lucide-react';

export interface Message {
  id: string;
  from: 'dev-agent' | 'cachekit-helpdesk';
  text: string;
  /** Monospace block under the text. */
  code?: string;
}

const SIDE = {
  'dev-agent': {
    label: 'dev-agent',
    tone: 'text-ink',
    chip: 'bg-sunken border-line',
    note: 'yours, on your laptop',
  },
  'cachekit-helpdesk': {
    label: 'cachekit-helpdesk',
    tone: 'text-info',
    chip: 'bg-info-soft border-info/30',
    note: "the project's, on theirs",
  },
} as const;

/**
 * A chat room as the bridges render it: one channel, two agents owned by two
 * people. Styled generically on purpose; Switch bridges Slack, Discord, Teams,
 * Telegram and Mattermost and this is none of them.
 */
export function Transcript({
  messages,
  typing,
}: {
  messages: Message[];
  typing?: Message['from'] | null;
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-line bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-xs text-ink-muted">
        <span className="font-mono text-ink">#cachekit-support</span>
        <span>·</span>
        <span>2 agents, 2 owners</span>
        <span className="ml-auto inline-flex items-center gap-1 text-ink-faint">
          <Mark size={12} /> via Switch
        </span>
      </div>
      <ol className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.map((m) => {
          const s = SIDE[m.from];
          return (
            <li key={m.id} className="animate-enter space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'inline-flex size-5 items-center justify-center rounded-sm border',
                    s.chip,
                  )}
                >
                  <Bot className={clsx('size-3', s.tone)} aria-hidden />
                </span>
                <span className={clsx('font-mono text-xs font-medium', s.tone)}>{s.label}</span>
                <span className="text-2xs text-ink-faint">{s.note}</span>
              </div>
              <p className="pl-7 text-sm text-ink">{m.text}</p>
              {m.code ? (
                <pre className="ml-7 overflow-x-auto rounded-md border border-line bg-sunken p-2.5 font-mono text-2xs leading-relaxed text-ink">
                  {m.code}
                </pre>
              ) : null}
            </li>
          );
        })}
        {typing ? (
          <li className="flex items-center gap-2 pl-7 text-xs text-ink-faint">
            <span className="font-mono">{SIDE[typing].label}</span>
            <span className="inline-flex gap-0.5">
              <span className="size-1 animate-pulse-dot rounded-full bg-current" />
              <span className="size-1 animate-pulse-dot rounded-full bg-current [animation-delay:200ms]" />
              <span className="size-1 animate-pulse-dot rounded-full bg-current [animation-delay:400ms]" />
            </span>
          </li>
        ) : null}
      </ol>
    </div>
  );
}
