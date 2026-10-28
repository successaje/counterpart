import { EmptyState, Mono, Section, SkeletonLines } from '@counterpart/ui';
import { Inbox } from 'lucide-react';
import { Link } from 'react-router';
import { ApprovalCard } from '../components/ApprovalCard.js';
import { CaseRow } from '../components/CaseRow.js';
import { RecordCard } from '../components/RecordCard.js';
import { selectActive, selectCases, selectPending, selectRecords } from '../lib/state.js';
import { useDesk } from '../lib/store.js';
import { Page } from './Page.js';

export function Now() {
  const { state } = useDesk();
  const pending = selectPending(state);
  const active = selectActive(state);
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

  const nothing = pending.length === 0 && active.length === 0;

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
          {active.map((r) => (
            <ApprovalCard key={r.id} record={r} />
          ))}
          {pending.map((r) => (
            <ApprovalCard key={r.id} record={r} />
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
