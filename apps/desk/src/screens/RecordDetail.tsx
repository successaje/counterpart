import { EmptyState, SkeletonLines } from '@counterpart/ui';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ApprovalCard } from '../components/ApprovalCard.js';
import { RecordCard } from '../components/RecordCard.js';
import { useDesk } from '../lib/store.js';
import { Page } from './Page.js';

export function RecordDetail() {
  const { id = '' } = useParams();
  const { state } = useDesk();
  const r = state.records[id];
  if (!state.loaded) {
    return (
      <Page title="Record">
        <SkeletonLines lines={4} />
      </Page>
    );
  }
  if (!r) {
    return (
      <Page title="Record not found">
        <EmptyState title={`No record ${id} in this ledger.`} />
      </Page>
    );
  }
  return (
    <Page
      title="Record"
      lede={<span className="font-mono">{r.id}</span>}
      actions={
        <Link
          to={`/cases/${r.request.caseId}`}
          className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-3.5" /> case
        </Link>
      }
    >
      {r.status === 'pending' || r.status === 'collecting' ? (
        <ApprovalCard record={r} />
      ) : (
        <RecordCard record={r} defaultOpen />
      )}
    </Page>
  );
}
