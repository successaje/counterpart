import { EmptyState, SkeletonLines } from '@counterpart/ui';
import { clsx } from 'clsx';
import { FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { CaseRow } from '../components/CaseRow.js';
import { selectCases, selectPending, selectRecords } from '../lib/state.js';
import { useDesk } from '../lib/store.js';
import { Page } from './Page.js';

export function Cases() {
  const { state } = useDesk();
  const [filter, setFilter] = useState<'open' | 'closed' | 'all'>('open');
  const cases = selectCases(state, filter === 'all' ? undefined : filter === 'open');
  const pending = selectPending(state);

  if (!state.loaded) {
    return (
      <Page title="Cases">
        <SkeletonLines lines={4} />
      </Page>
    );
  }

  return (
    <Page
      title="Cases"
      lede="One case per dependency problem, from first report to the issue or the fix."
      actions={
        <div className="flex rounded-md border border-line bg-surface p-0.5" role="tablist">
          {(['open', 'closed', 'all'] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={clsx(
                'rounded-sm px-2.5 py-1 text-xs capitalize transition-colors',
                filter === f ? 'bg-sunken font-medium text-ink' : 'text-ink-muted hover:text-ink',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      }
    >
      {cases.length ? (
        <div className="grid gap-2">
          {cases.map((c) => (
            <CaseRow
              key={c.id}
              c={c}
              pending={pending.filter((p) => p.request.caseId === c.id).length}
              records={selectRecords(state, c.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderOpen />}
          title={
            filter === 'open'
              ? 'No open cases'
              : filter === 'closed'
                ? 'No closed cases yet'
                : 'No cases yet'
          }
          body="Your agent opens a case when it starts working a dependency problem with a helpdesk. Closed cases end in an issue link or a sentence about the fix."
        />
      )}
    </Page>
  );
}
