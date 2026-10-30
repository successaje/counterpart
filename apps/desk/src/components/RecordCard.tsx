import { describeApproval, type EvidenceRecord, type Release } from '@counterpart/protocol';
import {
  Button,
  Card,
  Pill,
  type RecordStatus,
  RecordStatusPill,
  RelativeTime,
  SkeletonLines,
} from '@counterpart/ui';
import { clsx } from 'clsx';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api.js';
import { PayloadView } from './PayloadView.js';
import { RedactionView } from './RedactionView.js';
import { RequestEffect, RequestQuote, RequestTitle, RequestWho } from './RequestSummary.js';

export function RedactionPills({ record }: { record: Release }) {
  const counts = record.redaction?.counts ?? {};
  const entries = Object.entries(counts);
  if (record.status !== 'released') return null;
  if (entries.length === 0) return <Pill tone="neutral">nothing redacted</Pill>;
  return (
    <>
      {entries.map(([k, v]) => (
        <Pill key={k} tone="accent" mono>
          {v} {k}
        </Pill>
      ))}
    </>
  );
}

/**
 * One ledger entry. Collapsed: a line. Expanded: the request, the decision,
 * and what was released. When something was redacted, the owner can put the
 * raw record (which never left) next to the release.
 */
export function RecordCard({
  record,
  defaultOpen = false,
  showCase = false,
  caseSummary,
}: {
  record: Release;
  defaultOpen?: boolean;
  showCase?: boolean;
  caseSummary?: string | undefined;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [raw, setRaw] = useState<EvidenceRecord | null | 'loading'>(null);
  const [compare, setCompare] = useState(false);
  const [layout, setLayout] = useState<'inline' | 'columns'>('inline');
  const redacted = (record.redaction?.total ?? 0) > 0;

  const toggleCompare = async () => {
    if (compare) {
      setCompare(false);
      return;
    }
    setCompare(true);
    if (raw === null) {
      setRaw('loading');
      try {
        setRaw(await api.record(record.id));
      } catch {
        setRaw(null);
        setCompare(false);
      }
    }
  };

  return (
    <Card padded={false} className={clsx('overflow-hidden', open && 'ring-1 ring-line')}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper/60 sm:px-5"
      >
        <RequestTitle record={record} className="min-w-0 flex-1" />
        <div className="hidden items-center gap-1.5 sm:flex">
          <RedactionPills record={record} />
        </div>
        <RecordStatusPill status={record.status as RecordStatus} />
        <RelativeTime
          iso={record.createdAt}
          className="hidden w-16 text-right text-xs text-ink-faint sm:block"
        />
        <ChevronDown
          className={clsx(
            'size-4 shrink-0 text-ink-faint transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="animate-enter space-y-4 border-t border-line px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <RequestWho record={record} />
            {showCase ? (
              <Link
                to={`/cases/${record.request.caseId}`}
                className="text-xs text-info underline-offset-2 hover:underline"
              >
                {caseSummary
                  ? caseSummary.length > 56
                    ? `${caseSummary.slice(0, 56)}…`
                    : caseSummary
                  : record.request.caseId}
              </Link>
            ) : null}
          </div>
          <RequestQuote record={record} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="space-y-2">
              <h4 className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                Request
              </h4>
              <RequestEffect record={record} />
            </div>
            <div className="space-y-2">
              <h4 className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                Decision
              </h4>
              <p className="text-sm text-ink">{describeApproval(record)}</p>
              {record.approval?.note ? (
                <p className="text-sm italic text-ink-muted">“{record.approval.note}”</p>
              ) : null}
              {record.reason ? <p className="text-sm text-danger">{record.reason}</p> : null}
              <div className="flex flex-wrap gap-1.5 pt-1 sm:hidden">
                <RedactionPills record={record} />
              </div>
            </div>
          </div>

          {record.released ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                  {compare ? 'What was removed' : 'What left this machine'}
                </h4>
                {redacted ? (
                  <div className="flex items-center gap-1">
                    {compare ? (
                      <div
                        className="flex rounded-md border border-line bg-surface p-0.5"
                        role="tablist"
                        aria-label="Layout"
                      >
                        {(['inline', 'columns'] as const).map((l) => (
                          <button
                            key={l}
                            type="button"
                            role="tab"
                            aria-selected={layout === l}
                            onClick={() => setLayout(l)}
                            className={clsx(
                              'rounded-sm px-2 py-0.5 text-2xs transition-colors',
                              layout === l
                                ? 'bg-sunken font-medium text-ink'
                                : 'text-ink-muted hover:text-ink',
                            )}
                          >
                            {l === 'inline' ? 'in place' : 'side by side'}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={compare ? <EyeOff /> : <Eye />}
                      onClick={() => void toggleCompare()}
                    >
                      {compare ? 'Hide' : 'Show what was removed'}
                    </Button>
                  </div>
                ) : null}
              </div>
              {compare && layout === 'inline' ? (
                raw === 'loading' || raw === null ? (
                  <SkeletonLines lines={4} />
                ) : raw.raw ? (
                  <RedactionView raw={raw.raw} released={record.released} />
                ) : (
                  <p className="text-xs text-ink-faint">
                    The raw record was not kept (keepRaw is off), so there is nothing to compare.
                  </p>
                )
              ) : compare ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-2xs font-medium uppercase tracking-wider text-danger">
                      Stayed on this machine
                    </p>
                    {raw === 'loading' || raw === null ? (
                      <SkeletonLines lines={4} />
                    ) : raw.raw ? (
                      <PayloadView payload={raw.raw} marks={false} />
                    ) : (
                      <p className="text-xs text-ink-faint">
                        The raw record was not kept (keepRaw is off).
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-2xs font-medium uppercase tracking-wider text-accent">
                      Left this machine
                    </p>
                    <PayloadView payload={record.released} />
                  </div>
                </div>
              ) : (
                <PayloadView payload={record.released} />
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
