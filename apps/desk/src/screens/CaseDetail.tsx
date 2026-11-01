import {
  CASE_STATE_LABEL,
  type Case,
  type CaseState,
  draftEvidenceCard,
  EVIDENCE_INFO,
  type EvidenceType,
  formatEvidenceCard,
} from '@counterpart/protocol';
import {
  Button,
  Card,
  EmptyState,
  Mono,
  Pill,
  PrincipalChip,
  RelativeTime,
  Section,
  SkeletonLines,
  StackedBar,
  Stepper,
  Timeline,
} from '@counterpart/ui';
import { ArrowLeft, ExternalLink, ShieldOff } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { ApprovalCard } from '../components/ApprovalCard.js';
import { CopyButton } from '../components/CopyButton.js';
import { RecordCard } from '../components/RecordCard.js';
import { caseSegments, selectOutcomes, selectRecords } from '../lib/state.js';
import { useDesk } from '../lib/store.js';
import { caseTimeline } from '../lib/timeline.js';
import { Page } from './Page.js';

const FLOW: CaseState[] = [
  'reported',
  'evidence-requested',
  'evidence-collected',
  'diagnosed',
  'fix-proposed',
  'fix-verified',
  'resolved',
];

function steps(c: Case) {
  const list = FLOW.map((s) => ({ id: s, label: CASE_STATE_LABEL[s] }));
  if (c.state === 'filed') list[list.length - 1] = { id: 'filed', label: 'Filed' };
  return list;
}

/** For needs-human, show the last working state as the current step. */
function anchorState(c: Case): string {
  if (c.state !== 'needs-human') return c.state;
  const last = [...c.history].reverse().find((h) => h.to === 'needs-human');
  return last?.from ?? 'reported';
}

export function CaseDetail() {
  const { id = '' } = useParams();
  const { state, revokeTrust } = useDesk();
  const c = state.cases[id];
  const records = selectRecords(state, id);
  const pending = records.filter((r) => r.status === 'pending' || r.status === 'collecting');
  const settled = records.filter((r) => r.status !== 'pending' && r.status !== 'collecting');
  const timeline = useMemo(() => (c ? caseTimeline(c, records) : []), [c, records]);
  const outcomes = selectOutcomes(records);
  const redactions = records.reduce((n, r) => n + (r.redaction?.total ?? 0), 0);
  const segments = caseSegments(records);

  if (!state.loaded) {
    return (
      <Page title="Case">
        <SkeletonLines lines={5} />
      </Page>
    );
  }
  if (!c) {
    return (
      <Page title="Case not found">
        <EmptyState
          title={`There is no case ${id} in this project's ledger.`}
          body="It may belong to another project, or the id was mistyped."
          action={
            <Link to="/cases" className="text-sm text-info underline-offset-2 hover:underline">
              Back to cases
            </Link>
          }
        />
      </Page>
    );
  }

  const card = formatEvidenceCard(draftEvidenceCard(c, [...records].reverse()));

  return (
    <Page
      title={c.summary}
      lede={
        <span className="flex flex-wrap items-center gap-2">
          <Mono>{c.id}</Mono>
          {c.dependency ? (
            <span>
              about <Mono>{c.dependency}</Mono>
            </span>
          ) : null}
          <span>
            opened <RelativeTime iso={c.createdAt} />
          </span>
        </span>
      }
      actions={
        <Link
          to="/cases"
          className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-3.5" /> cases
        </Link>
      }
    >
      <Card className="space-y-4">
        <Stepper
          steps={steps(c)}
          current={anchorState(c)}
          aside={c.state === 'needs-human' ? { label: 'Needs a human', tone: 'danger' } : null}
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {c.helpdesk ? (
            <span className="flex items-center gap-2 text-ink-muted">
              helpdesk{' '}
              <PrincipalChip name={c.helpdesk.name} kind={c.helpdesk.kind} side={c.helpdesk.side} />
            </span>
          ) : (
            <span className="text-ink-faint">no helpdesk recorded yet</span>
          )}
          {c.thread ? (
            <a
              href={c.thread}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-info underline-offset-2 hover:underline"
            >
              room thread <ExternalLink className="size-3.5" />
            </a>
          ) : null}
          {c.resolution ? <span className="text-ink">Resolution: {c.resolution}</span> : null}
        </div>
        {records.length ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-3">
            <StackedBar
              segments={segments}
              size="sm"
              className="min-w-56 flex-1"
              aria-label={`${outcomes.released} of ${records.length} requests left this machine`}
            />
            <span className="text-xs text-ink-muted">
              {redactions === 0
                ? 'nothing redacted'
                : `${redactions} redaction${redactions === 1 ? '' : 's'} before release`}
            </span>
          </div>
        ) : null}
        {c.trusted.length ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
            <span className="text-ink-muted">Trusted for this case:</span>
            {c.trusted.map((t) => (
              <span key={t} className="inline-flex items-center gap-1">
                <Pill tone="accent">
                  {EVIDENCE_INFO[t as EvidenceType]?.code} {t}
                </Pill>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<ShieldOff />}
                  aria-label={`Stop trusting ${t} for this case`}
                  onClick={() => void revokeTrust(c.id, t as EvidenceType)}
                >
                  revoke
                </Button>
              </span>
            ))}
          </div>
        ) : null}
      </Card>

      {pending.length ? (
        <Section title="Waiting for you">
          <div className="space-y-4">
            {pending.map((r) => (
              <ApprovalCard key={r.id} record={r} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section
        title="Ledger"
        description={`${settled.length} record${settled.length === 1 ? '' : 's'}, newest first`}
      >
        {settled.length ? (
          <div className="grid gap-2">
            {settled.map((r, i) => (
              <RecordCard key={r.id} record={r} defaultOpen={i === 0 && settled.length === 1} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-faint">No records yet.</p>
        )}
      </Section>

      <Section
        title="Evidence card"
        description="Drafted from the releases above; your agent posts a version of this to the room."
        actions={
          <CopyButton text={card} size="sm" variant="outline">
            Copy Markdown
          </CopyButton>
        }
      >
        <Card padded={false}>
          <pre className="scrollbar-thin overflow-x-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink">
            {card}
          </pre>
        </Card>
      </Section>

      <Section
        title="Timeline"
        description="Every request, decision, release and state change, oldest first."
      >
        <Card>
          <Timeline entries={timeline} />
        </Card>
      </Section>
    </Page>
  );
}
