import type { Release } from '@counterpart/protocol';
import { Button, Card, Dialog, Field, RecordStatusPill, Textarea } from '@counterpart/ui';
import { Check, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useDesk } from '../lib/store.js';
import { RequestEffect, RequestQuote, RequestTitle, RequestWho } from './RequestSummary.js';

/**
 * The approval card: the one screen the whole product is built around. It
 * says who asked, what they said, exactly what will happen, and offers three
 * decisions. After "allow" it shows the stages until the release lands.
 */
export function ApprovalCard({ record }: { record: Release }) {
  const { state, decide } = useDesk();
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState('');
  const busy = Boolean(state.deciding[record.id]) || record.status === 'collecting';
  const c = state.cases[record.request.caseId];
  const type = record.request.type;

  return (
    <Card
      rule={record.status === 'collecting' ? 'info' : 'pending'}
      className="animate-enter space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <RequestTitle record={record} />
          <RequestWho record={record} />
        </div>
        <div className="flex items-center gap-2">
          <RecordStatusPill status={record.status as 'pending' | 'collecting'} />
          {c ? (
            <Link
              to={`/cases/${c.id}`}
              className="text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              {c.summary.length > 48 ? `${c.summary.slice(0, 48)}…` : c.summary}
            </Link>
          ) : null}
        </div>
      </div>

      <RequestQuote record={record} />

      <div className="rounded-md border border-line bg-paper/60 p-3 sm:p-4">
        <RequestEffect record={record} menu={state.info?.menu} />
      </div>

      {record.status === 'collecting' ? (
        <Stages />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="solid"
            tone="accent"
            icon={<Check />}
            busy={busy}
            onClick={() => void decide(record.id, 'allowed-once')}
          >
            Allow once
          </Button>
          {type !== 'other' ? (
            <Button
              variant="outline"
              icon={<ShieldCheck />}
              disabled={busy}
              onClick={() => void decide(record.id, 'allowed-for-case')}
              title="Allow this and every later request of the same type on this case"
            >
              Allow for this case
            </Button>
          ) : null}
          <Button
            variant="ghost"
            tone="danger"
            icon={<X />}
            disabled={busy}
            onClick={() => setDeclining(true)}
            className="ml-auto"
          >
            Decline
          </Button>
        </div>
      )}

      <Dialog
        open={declining}
        onClose={() => setDeclining(false)}
        title="Decline this request"
        description="Your agent will tell the helpdesk it was declined. A short reason helps them ask for something else."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeclining(false)}>
              Keep it pending
            </Button>
            <Button
              variant="solid"
              tone="danger"
              onClick={() => {
                setDeclining(false);
                void decide(record.id, 'declined', note.trim() || undefined);
              }}
            >
              Decline
            </Button>
          </>
        }
      >
        <Field label="Reason" hint="Optional. Recorded in the ledger and relayed by your agent.">
          {(id) => (
            <Textarea
              id={id}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. That file holds customer data; ask for config/cache.yaml instead."
            />
          )}
        </Field>
      </Dialog>
    </Card>
  );
}

function Stages() {
  const steps = [
    { label: 'Approved', state: 'done' },
    { label: 'Collecting and redacting', state: 'active' },
    { label: 'Released to your agent', state: 'todo' },
  ] as const;
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-1.5">
          <span
            className={
              s.state === 'done'
                ? 'size-1.5 rounded-full bg-accent'
                : s.state === 'active'
                  ? 'size-1.5 animate-pulse-dot rounded-full bg-info'
                  : 'size-1.5 rounded-full bg-line-strong'
            }
          />
          <span
            className={
              s.state === 'todo'
                ? 'text-ink-faint'
                : s.state === 'active'
                  ? 'font-medium text-ink'
                  : 'text-ink-muted'
            }
          >
            {s.label}
          </span>
          {i < steps.length - 1 ? (
            <span className="ml-1.5 h-px w-4 bg-line-strong" aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
