import { EVIDENCE_TYPES } from '@counterpart/protocol';
import {
  BarList,
  Card,
  EmptyState,
  Input,
  type Segment,
  SkeletonLines,
  StackedBar,
} from '@counterpart/ui';
import { clsx } from 'clsx';
import { BookOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { RecordCard } from '../components/RecordCard.js';
import { selectByType, selectOutcomes, selectRecords, selectTotals } from '../lib/state.js';
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
  const outcomes = useMemo(() => selectOutcomes(all), [all]);
  const byType = useMemo(() => selectByType(all), [all]);
  const redactionRows = useMemo(
    () =>
      Object.entries(totals.redactions)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => ({ id: k, label: k, value: v, tone: 'accent' as const })),
    [totals],
  );
  const segments: Segment[] = [
    { id: 'released', label: 'left this machine', value: outcomes.released, tone: 'accent' },
    { id: 'declined', label: 'you declined', value: outcomes.declined, tone: 'danger' },
    { id: 'refused', label: 'outside the menu', value: outcomes.refused, tone: 'pending' },
    { id: 'other', label: 'failed or expired', value: outcomes.other, tone: 'neutral' },
  ];

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
      <div className="grid gap-3 md:grid-cols-3">
        <Overview label="Requests" value={all.length} hint="decided so far">
          <StackedBar segments={segments} aria-label={`${all.length} requests`} />
        </Overview>
        <Overview label="Redactions" value={totals.redactionTotal} hint="removed before release">
          <BarList items={redactionRows} empty="Nothing has needed redacting." />
        </Overview>
        <Overview
          label="By evidence type"
          value={byType.filter((t) => t.type !== 'other' && t.total > 0).length}
          hint="of 6 types used"
        >
          <BarList
            items={byType
              .filter((t) => t.total > 0)
              .map((t) => ({
                id: t.type,
                label: (
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-ink-faint">{t.code}</span>
                    {t.label}
                  </span>
                ),
                value: t.total,
                tone: t.type === 'other' ? 'pending' : 'info',
                hint: t.type === 'other' ? 'refused' : `· ${t.released} left`,
              }))}
            empty="No requests yet."
          />
        </Overview>
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

function Overview({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: number;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-ink-muted">{label}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="font-mono text-2xl font-medium tabular-nums leading-none text-ink">
            {value}
          </span>
          <span className="text-2xs text-ink-faint">{hint}</span>
        </span>
      </div>
      {children}
    </Card>
  );
}
