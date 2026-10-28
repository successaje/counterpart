import {
  CASE_STATE_LABEL,
  type Case,
  EVIDENCE_INFO,
  type Release,
  redactionSummary,
} from '@counterpart/protocol';

export type EventTone = 'neutral' | 'accent' | 'pending' | 'danger' | 'info';

export interface CaseEvent {
  id: string;
  at: string;
  tone: EventTone;
  title: string;
  detail?: string | undefined;
  by?: string | undefined;
  /** Something left the machine at this moment. */
  crossed?: boolean;
  /** Tie-break for events with the same timestamp. */
  order: number;
}

export function requestLabel(r: Release): string {
  const req = r.request;
  if (req.type === 'other') return `something outside the menu (${req.args.asked})`;
  const info = EVIDENCE_INFO[req.type];
  if (req.type === 'command') return `${info.code} ${info.title.toLowerCase()} ${req.args.name}`;
  return `${info.code} ${info.title.toLowerCase()}`;
}

function transitionTone(to: Case['state']): EventTone {
  switch (to) {
    case 'needs-human':
      return 'danger';
    case 'resolved':
      return 'accent';
    case 'filed':
      return 'neutral';
    default:
      return 'info';
  }
}

/**
 * The case as a story: every state change and every request, decision,
 * release and refusal, in the order they happened.
 */
export function caseTimeline(c: Case, records: readonly Release[]): CaseEvent[] {
  const events: CaseEvent[] = [
    { id: `${c.id}:open`, at: c.createdAt, tone: 'info', title: 'Case opened', order: 0 },
  ];

  c.history.forEach((h, i) => {
    if (h.from === h.to) {
      events.push({
        id: `${c.id}:note:${i}`,
        at: h.at,
        tone: 'neutral',
        title: 'Note',
        detail: h.note,
        by: h.by.name,
        order: 5,
      });
      return;
    }
    events.push({
      id: `${c.id}:move:${i}`,
      at: h.at,
      // The runner's own bookkeeping moves read quieter than decisions people made.
      tone: h.by.name === 'counterpart-runner' ? 'neutral' : transitionTone(h.to),
      title: `${CASE_STATE_LABEL[h.from]} → ${CASE_STATE_LABEL[h.to]}`,
      detail: h.note,
      by: h.by.name,
      order: 5,
    });
  });

  for (const r of records) {
    const label = requestLabel(r);
    const asked = r.request.requestedBy.name;
    if (r.status === 'refused') {
      events.push({
        id: `${r.id}:refused`,
        at: r.createdAt,
        tone: 'danger',
        title: `Refused ${label}`,
        detail: r.reason ?? `“${r.request.requestText}”`,
        by: asked,
        order: 1,
      });
      continue;
    }
    events.push({
      id: `${r.id}:asked`,
      at: r.request.createdAt,
      tone: 'pending',
      title: `Asked for ${label}`,
      detail: `“${r.request.requestText}”`,
      by: asked,
      order: 1,
    });
    const a = r.approval;
    if (a) {
      const by = a.via === 'desk' || a.via === 'cli' ? 'you' : undefined;
      switch (a.decision) {
        case 'automatic':
          events.push({
            id: `${r.id}:auto`,
            at: a.decidedAt,
            tone: 'neutral',
            title: 'Allowed automatically by policy',
            order: 2,
          });
          break;
        case 'allowed-once':
          events.push({
            id: `${r.id}:allowed`,
            at: a.decidedAt,
            tone: 'accent',
            title: `Allowed once via ${a.via}`,
            detail: a.note,
            by,
            order: 2,
          });
          break;
        case 'allowed-for-case':
          events.push({
            id: `${r.id}:allowed`,
            at: a.decidedAt,
            tone: 'accent',
            title:
              a.via === 'case-trust'
                ? 'Allowed by trust for this case'
                : `Allowed for this case via ${a.via}`,
            detail: a.note,
            by,
            order: 2,
          });
          break;
        case 'declined':
          events.push({
            id: `${r.id}:declined`,
            at: a.decidedAt,
            tone: 'danger',
            title: `Declined via ${a.via}`,
            detail: a.note,
            by,
            order: 2,
          });
          break;
        case 'expired':
          events.push({
            id: `${r.id}:expired`,
            at: a.decidedAt,
            tone: 'neutral',
            title: 'Expired without a decision',
            order: 2,
          });
          break;
      }
    } else if (r.status === 'expired') {
      events.push({
        id: `${r.id}:expired`,
        at: r.updatedAt,
        tone: 'neutral',
        title: 'Expired without a decision',
        order: 2,
      });
    }
    if (r.status === 'released') {
      events.push({
        id: `${r.id}:released`,
        at: r.finishedAt ?? r.updatedAt,
        tone: 'accent',
        title: `Released ${label}`,
        detail: redactionSummary(r),
        crossed: true,
        order: 3,
      });
    } else if (r.status === 'failed') {
      events.push({
        id: `${r.id}:failed`,
        at: r.finishedAt ?? r.updatedAt,
        tone: 'danger',
        title: `Failed to collect ${label}`,
        detail: r.reason,
        order: 3,
      });
    }
  }

  return events.sort((x, y) => x.at.localeCompare(y.at) || x.order - y.order);
}
