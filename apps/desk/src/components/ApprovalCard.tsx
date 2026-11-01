import type { Release } from '@counterpart/protocol';
import {
  Button,
  Card,
  Dialog,
  durationLabel,
  Field,
  Kbd,
  RecordStatusPill,
  Textarea,
} from '@counterpart/ui';
import { Check, Clock, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useShortcuts } from '../lib/shortcuts.js';
import { useDesk } from '../lib/store.js';
import { RequestPath } from './RequestPath.js';
import { RequestEffect, RequestQuote, RequestTitle, RequestWho } from './RequestSummary.js';

/**
 * The approval card: the one screen the whole product is built around. It
 * says who asked, what they said, exactly what will happen, and offers three
 * decisions. The path under the request shows where it is on its way from
 * the room to the agent; after "allow" it moves along until the release lands.
 */
export function ApprovalCard({
  record,
  hotkeys = false,
}: {
  record: Release;
  /** Bind a / c / d to this card: the first one waiting. */
  hotkeys?: boolean;
}) {
  const { state, decide } = useDesk();
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState('');
  const busy = Boolean(state.deciding[record.id]) || record.status === 'collecting';
  const c = state.cases[record.request.caseId];
  const type = record.request.type;
  const pending = record.status === 'pending';
  const expiresAt = Date.parse(record.createdAt) + (state.info?.limits.approvalWaitMs ?? 0);

  useShortcuts(
    {
      a: () => void decide(record.id, 'allowed-once'),
      c: () => (type !== 'other' ? void decide(record.id, 'allowed-for-case') : undefined),
      d: () => setDeclining(true),
    },
    hotkeys && pending && !busy,
  );

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
          {pending && state.info ? <Expiry at={expiresAt} /> : null}
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

      <RequestPath record={record} />

      {record.status === 'collecting' ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="solid"
            tone="accent"
            icon={<Check />}
            busy={busy}
            onClick={() => void decide(record.id, 'allowed-once')}
          >
            Allow once{hotkeys ? <Kbd>a</Kbd> : null}
          </Button>
          {type !== 'other' ? (
            <Button
              variant="outline"
              icon={<ShieldCheck />}
              disabled={busy}
              onClick={() => void decide(record.id, 'allowed-for-case')}
              title="Allow this and every later request of the same type on this case"
            >
              Allow for this case{hotkeys ? <Kbd>c</Kbd> : null}
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
            Decline{hotkeys ? <Kbd>d</Kbd> : null}
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

/** "expires in 9 min": a request nobody decides lapses after limits.approvalWaitMs. */
function Expiry({ at }: { at: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);
  const left = at - Date.now();
  if (!Number.isFinite(left)) return null;
  const soon = left < 2 * 60_000;
  return (
    <span
      className={`inline-flex items-center gap-1 text-2xs ${soon ? 'text-danger' : 'text-ink-faint'}`}
      title={`Expires ${new Date(at).toLocaleTimeString()}`}
    >
      <Clock className="size-3" aria-hidden />
      {left <= 0 ? 'expiring' : `expires in ${durationLabel(left)}`}
    </span>
  );
}
