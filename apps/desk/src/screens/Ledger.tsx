import { EVIDENCE_TYPES } from '@counterpart/protocol';
import { Card, EmptyState, Input, Pill, SkeletonLines } from '@counterpart/ui';
import { clsx } from 'clsx';
import { BookOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { RecordCard } from '../components/RecordCard.js';
import { selectRecords, selectTotals } from '../lib/state.js';
import { useDesk } from '../lib/store.js';
import { Page } from './Page.js';

const STATUSES = ['all', 'released', 'refused', 'declined', 'failed', 'expired'] as const;

export function Ledger() {
  const { state } = useDesk();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('all');
  const [type, setType] = useState<string>('all');
  const [q, setQ] = useState('');
  const all = useMemo(
    () => selectRecords(state).filter((r) => r.status !== 'pending' && r.status !== 'collecting'),
    [state],
  );
  const totals = useMemo(() => selectTotals(all), [all]);

  const shown = all.filter((r) => {
    if (status !== 'all' && r.status !== status) return false;
    if (type !== 'all' && r.request.type !== type) return false;
    if (q) {
      const hay =
        `${r.request.requestText} ${r.request.requestedBy.name} ${r.reason ?? ''} ${r.id}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  if (!state.loaded) {
    return (
      <Page title="Ledger">
        <SkeletonLines lines={5} />
      </Page>
    );
  }

  return (
    <Page
      title="Ledger"
      lede="Everything a helpdesk asked for, what you decided, and what left this machine."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Released" value={totals.released} tone="accent" />
        <Stat label="Refused or declined" value={totals.refused + totals.declined} tone="danger" />
        <Stat
          label="Redactions"
          value={totals.redactionTotal}
          tone="neutral"
          detail={
            Object.entries(totals.redactions)
              .map(([k, v]) => `${v} ${k}`)
              .join(' · ') || 'none so far'
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex rounded-md border border-line bg-surface p-0.5"
          role="tablist"
          aria-label="Status"
        >
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={status === s}
              onClick={() => setStatus(s)}
              className={clsx(
                'rounded-sm px-2 py-1 text-xs capitalize transition-colors',
                status === s ? 'bg-sunken font-medium text-ink' : 'text-ink-muted hover:text-ink',
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Evidence type"
          className="h-7 rounded-md border border-line bg-surface px-2 text-xs text-ink"
        >
          <option value="all">all types</option>
          {EVIDENCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          <option value="other">outside the menu</option>
        </select>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search requests"
          aria-label="Search"
          className="h-7 max-w-56 text-xs"
        />
        <span className="ml-auto text-xs text-ink-faint">
          {shown.length} of {all.length}
        </span>
      </div>

      {shown.length ? (
        <div className="grid gap-2">
          {shown.map((r) => (
            <RecordCard
              key={r.id}
              record={r}
              showCase
              caseSummary={state.cases[r.request.caseId]?.summary}
            />
          ))}
        </div>
      ) : all.length ? (
        <EmptyState title="No records match" body="Try another status, type or search." />
      ) : (
        <EmptyState
          icon={<BookOpen />}
          title="The ledger is empty"
          body="Every request, decision, release and refusal will be recorded here, with raw evidence kept on this machine for comparison."
        />
      )}
    </Page>
  );
}

function Stat({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: number;
  tone: 'accent' | 'danger' | 'neutral';
  detail?: string;
}) {
  return (
    <Card className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-muted">{label}</span>
        <Pill tone={tone} dot>
          {tone === 'accent' ? 'left' : tone === 'danger' ? 'stayed' : 'removed'}
        </Pill>
      </div>
      <div className="font-mono text-2xl font-medium tabular-nums text-ink">{value}</div>
      {detail ? <div className="truncate text-xs text-ink-faint">{detail}</div> : null}
    </Card>
  );
}
