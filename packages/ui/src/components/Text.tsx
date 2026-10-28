import { clsx } from 'clsx';
import { type ReactNode, useState } from 'react';

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <code
      className={clsx(
        'rounded-sm bg-sunken px-1 py-0.5 font-mono text-[0.9em] text-ink',
        className,
      )}
    >
      {children}
    </code>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-sm border border-line-strong bg-surface px-1.5 py-0.5 font-mono text-2xs text-ink-muted">
      {children}
    </kbd>
  );
}

export interface CodeBlockProps {
  children: string;
  /** Lines shown before the block is expanded. */
  collapsedLines?: number;
  label?: string;
  className?: string;
  /** Highlight redaction tokens. */
  marks?: boolean;
}

const TOKEN = /(«redacted:[a-z-]+»)/g;

function highlight(line: string) {
  const parts = line.split(TOKEN);
  if (parts.length === 1) return line;
  return parts.map((p, i) =>
    /^«redacted:[a-z-]+»$/.test(p) ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: parts are positional fragments of one line.
      <mark key={i} className="rounded-sm bg-accent-soft px-0.5 text-accent">
        {p}
      </mark>
    ) : (
      p
    ),
  );
}

export function CodeBlock({
  children,
  collapsedLines = 14,
  label,
  className,
  marks = true,
}: CodeBlockProps) {
  const [open, setOpen] = useState(false);
  const lines = children.replace(/\n$/, '').split('\n');
  const overflow = lines.length > collapsedLines;
  const shown = open || !overflow ? lines : lines.slice(0, collapsedLines);
  return (
    <div className={clsx('overflow-hidden rounded-md border border-line bg-sunken', className)}>
      {label ? (
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5 font-mono text-2xs text-ink-faint">
          <span>{label}</span>
          <span>{lines.length} lines</span>
        </div>
      ) : null}
      <pre className="scrollbar-thin overflow-x-auto p-3 font-mono text-xs leading-relaxed text-ink">
        {shown.map((l, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: output lines have no identity.
          <div key={i} className="whitespace-pre">
            {marks ? highlight(l) : l}
            {l === '' ? ' ' : null}
          </div>
        ))}
      </pre>
      {overflow ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="block w-full border-t border-line px-3 py-1.5 text-left font-mono text-2xs text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          {open ? 'show less' : `show ${lines.length - collapsedLines} more lines`}
        </button>
      ) : null}
    </div>
  );
}
