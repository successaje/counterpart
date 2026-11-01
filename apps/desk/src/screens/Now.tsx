import type { Release } from '@counterpart/protocol';
import { EmptyState, Mono, Section, SkeletonLines } from '@counterpart/ui';
import { Inbox } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ApprovalCard } from '../components/ApprovalCard.js';
import { CaseRow } from '../components/CaseRow.js';
import { RecordCard } from '../components/RecordCard.js';
import { selectActive, selectCases, selectPending, selectRecords } from '../lib/state.js';
import { useDesk } from '../lib/store.js';
import { Page } from './Page.js';

const LEAVE_MS = 260;

/**
 * Cards that just settled stay on screen for one short exit animation
 * instead of vanishing, so the eye can follow where a decision went.
 */
function useLeaving(cards: Release[]): Release[] {
  const prev = useRef<Release[]>([]);
  const [leaving, setLeaving] = useState<Release[]>([]);
  useEffect(() => {
    const ids = new Set(cards.map((c) => c.id));
    const gone = prev.current.filter((c) => !ids.has(c.id));
    prev.current = cards;
    if (gone.length === 0) return;
    setLeaving((l) => [...l, ...gone]);
    // Not cleaned up on purpose: the list is rebuilt every render, and a
    // cancelled timer would leave the card on screen for good.
    setTimeout(
      () => setLeaving((l) => l.filter((c) => !gone.some((g) => g.id === c.id))),
      LEAVE_MS,
    );
  }, [cards]);
  return leaving;
}

export function Now() {
  const { state } = useDesk();
  const pending = selectPending(state);
  const active = selectActive(state);
  const leaving = useLeaving([...active, ...pending]);
  const open = selectCases(state, true);
  const recent = selectRecords(state)
    .filter((r) => r.status !== 'pending' && r.status !== 'collecting')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  if (!state.loaded) {
    return (
      <Page title="Now">
        <SkeletonLines lines={4} />
      </Page>
    );
  }

  const nothing = pending.length === 0 && active.length === 0 && leaving.length === 0;

  return (
    <Page
      title={
        pending.length
          ? `${pending.length} request${pending.length === 1 ? '' : 's'} waiting for you`
          : 'Now'
      }
      lede={
        pending.length
          ? 'Each card says exactly what will run or be read if you allow it. Output is redacted before it leaves.'
          : 'Requests from a helpdesk appear here first. Nothing runs or leaves this machine until you decide.'
      }
    >
      {nothing ? (
        <EmptyState
          icon={<Inbox />}
          title="Nothing is waiting for you"
          body={
            open.length ? (
              <>
                Your agent is in {open.length === 1 ? 'a case' : `${open.length} cases`}. When the
                helpdesk asks for evidence, the request lands here.
              </>
            ) : (
              <div className="space-y-2">
                <p>
                  Connect your coding agent to this project and the first request will show up here.
                  In a terminal, in this project:
                </p>
                <Mono className="block w-fit">claude mcp add counterpart -- counterpart mcp</Mono>
                <p>Then join a room where the project's helpdesk agent is, and let them talk.</p>
              </div>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {leaving.map((r) => (
            <div key={`leaving-${r.id}`} className="pointer-events-none animate-leave" aria-hidden>
              <ApprovalCard record={r} />
            </div>
          ))}
          {active.map((r) => (
            <ApprovalCard key={r.id} record={r} />
          ))}
          {pending.map((r, i) => (
            <ApprovalCard key={r.id} record={r} hotkeys={i === 0} />
          ))}
        </div>
      )}

      <Section
        title="Open cases"
        actions={
          <Link
            to="/cases"
            className="text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            all cases
          </Link>
        }
      >
        {open.length ? (
          <div className="grid gap-2">
            {open.map((c) => (
              <CaseRow
                key={c.id}
                c={c}
                pending={pending.filter((p) => p.request.caseId === c.id).length}
                records={selectRecords(state, c.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-faint">
            No open cases. Your agent opens one when a dependency problem starts.
          </p>
        )}
      </Section>

      <Section
        title="Recent activity"
        actions={
          <Link
            to="/ledger"
            className="text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            full ledger
          </Link>
        }
      >
        {recent.length ? (
          <div className="grid gap-2">
            {recent.map((r) => (
              <RecordCard
                key={r.id}
                record={r}
                showCase
                caseSummary={state.cases[r.request.caseId]?.summary}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-faint">
            Nothing has been released, refused or declined yet.
          </p>
        )}
      </Section>
    </Page>
  );
}
