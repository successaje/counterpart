import { CASE_STATE_LABEL, type Case, type Release } from '@counterpart/protocol';
import { Pill, PrincipalChip, RelativeTime, StackedBar } from '@counterpart/ui';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { caseSegments } from '../lib/state.js';

const TONE: Record<Case['state'], 'neutral' | 'accent' | 'pending' | 'danger' | 'info'> = {
  reported: 'neutral',
  'evidence-requested': 'pending',
  'evidence-collected': 'info',
  diagnosed: 'info',
  'fix-proposed': 'info',
  'fix-verified': 'accent',
  filed: 'accent',
  resolved: 'accent',
  'needs-human': 'danger',
};

export function caseTone(state: Case['state']) {
  return TONE[state];
}

function outcomeLine(segments: ReturnType<typeof caseSegments>, total: number): string {
  const left = segments.find((s) => s.id === 'released')?.value ?? 0;
  const waiting = segments.find((s) => s.id === 'waiting')?.value ?? 0;
  const parts = [`${left} of ${total} left this machine`];
  if (waiting) parts.push(`${waiting} waiting for you`);
  return parts.join(' · ');
}

/**
 * One case in a list. The bar under the summary is the case's record of
 * what left the machine, what stayed, and what is still waiting; the list
 * reads as a ledger of boundaries, not just of states.
 */
export function CaseRow({
  c,
  pending = 0,
  records = [],
}: {
  c: Case;
  pending?: number;
  records?: readonly Release[];
}) {
  const segments = caseSegments(records);
  return (
    <Link
      to={`/cases/${c.id}`}
      className="group flex min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-line bg-surface px-4 py-3 shadow-card transition-colors hover:border-line-strong"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 max-w-full truncate text-sm font-medium text-ink">
            {c.summary}
          </span>
          {pending > 0 ? (
            <Pill tone="pending" dot live>
              {pending} waiting
            </Pill>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
          <Pill tone={TONE[c.state]}>{CASE_STATE_LABEL[c.state]}</Pill>
          {c.dependency ? <span className="font-mono">{c.dependency}</span> : null}
          {c.helpdesk ? (
            <PrincipalChip name={c.helpdesk.name} kind={c.helpdesk.kind} side={c.helpdesk.side} />
          ) : null}
          <span>
            {c.recordIds.length} record{c.recordIds.length === 1 ? '' : 's'}
          </span>
          <span>
            · updated <RelativeTime iso={c.updatedAt} />
          </span>
        </div>
        {records.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <StackedBar
              segments={segments}
              size="sm"
              legend={false}
              className="w-40 max-w-full"
              aria-label={outcomeLine(segments, records.length)}
            />
            <span className="text-2xs text-ink-faint">{outcomeLine(segments, records.length)}</span>
          </div>
        ) : null}
      </div>
      <ChevronRight className="size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
