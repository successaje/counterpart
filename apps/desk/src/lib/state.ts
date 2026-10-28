import { type Case, EVIDENCE_INFO, EVIDENCE_TYPES, type Release } from '@counterpart/protocol';
import type { DeskEvent, RunnerInfo } from './api.js';

export type Connection = 'connecting' | 'live' | 'offline' | 'unauthorized';

export interface DeskState {
  connection: Connection;
  loaded: boolean;
  info: RunnerInfo | null;
  cases: Record<string, Case>;
  records: Record<string, Release>;
  /** Record ids the owner has just acted on, for optimistic UI. */
  deciding: Record<string, true>;
  /** Approval requests that arrived while the tab was open, newest first. */
  arrivals: string[];
}

export const initialState: DeskState = {
  connection: 'connecting',
  loaded: false,
  info: null,
  cases: {},
  records: {},
  deciding: {},
  arrivals: [],
};

export type Action =
  | { type: 'connection'; connection: Connection }
  | { type: 'hydrate'; info: RunnerInfo; cases: Case[]; records: Release[] }
  | { type: 'event'; event: DeskEvent }
  | { type: 'deciding'; recordId: string; on: boolean };

function byId<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((i) => [i.id, i]));
}

export function reduce(state: DeskState, action: Action): DeskState {
  switch (action.type) {
    case 'connection':
      return state.connection === action.connection
        ? state
        : { ...state, connection: action.connection };
    case 'hydrate':
      return {
        ...state,
        loaded: true,
        info: action.info,
        cases: byId(action.cases),
        records: byId(action.records),
      };
    case 'deciding': {
      const deciding = { ...state.deciding };
      if (action.on) deciding[action.recordId] = true;
      else delete deciding[action.recordId];
      return { ...state, deciding };
    }
    case 'event':
      return applyEvent(state, action.event);
  }
}

export function applyEvent(state: DeskState, event: DeskEvent): DeskState {
  switch (event.type) {
    case 'case.created':
    case 'case.updated':
      return { ...state, cases: { ...state.cases, [event.case.id]: event.case } };
    case 'record.created':
    case 'record.updated': {
      const deciding = { ...state.deciding };
      if (event.record.status !== 'pending') delete deciding[event.record.id];
      return { ...state, records: { ...state.records, [event.record.id]: event.record }, deciding };
    }
    case 'approval.requested':
      return {
        ...state,
        records: { ...state.records, [event.record.id]: event.record },
        arrivals: [event.record.id, ...state.arrivals.filter((id) => id !== event.record.id)].slice(
          0,
          20,
        ),
      };
    case 'approval.decided':
      return { ...state, records: { ...state.records, [event.record.id]: event.record } };
  }
}

// ─── selectors ──────────────────────────────────────────────────────────────

const TERMINAL = new Set(['filed', 'resolved']);

export function selectPending(state: DeskState): Release[] {
  return Object.values(state.records)
    .filter((r) => r.status === 'pending')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function selectActive(state: DeskState): Release[] {
  return Object.values(state.records)
    .filter((r) => r.status === 'collecting')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function selectCases(state: DeskState, open?: boolean): Case[] {
  return Object.values(state.cases)
    .filter((c) => open === undefined || !TERMINAL.has(c.state) === open)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function selectRecords(state: DeskState, caseId?: string): Release[] {
  return Object.values(state.records)
    .filter((r) => !caseId || r.request.caseId === caseId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface LedgerTotals {
  released: number;
  refused: number;
  declined: number;
  other: number;
  redactions: Record<string, number>;
  redactionTotal: number;
}

export function selectTotals(records: Release[]): LedgerTotals {
  const t: LedgerTotals = {
    released: 0,
    refused: 0,
    declined: 0,
    other: 0,
    redactions: {},
    redactionTotal: 0,
  };
  for (const r of records) {
    if (r.status === 'released') t.released++;
    else if (r.status === 'refused') t.refused++;
    else if (r.status === 'declined') t.declined++;
    else t.other++;
    for (const [k, v] of Object.entries(r.redaction?.counts ?? {})) {
      t.redactions[k] = (t.redactions[k] ?? 0) + v;
      t.redactionTotal += v;
    }
  }
  return t;
}

export interface TypeCount {
  type: string;
  code: string;
  label: string;
  total: number;
  released: number;
}

/** Requests per evidence type, plus everything outside the menu, in menu order. */
export function selectByType(records: readonly Release[]): TypeCount[] {
  const rows: TypeCount[] = [
    ...EVIDENCE_TYPES.map((t) => ({
      type: t,
      code: EVIDENCE_INFO[t].code,
      label: EVIDENCE_INFO[t].title,
      total: 0,
      released: 0,
    })),
    { type: 'other', code: '—', label: 'Off the menu', total: 0, released: 0 },
  ];
  const byType = new Map(rows.map((r) => [r.type, r]));
  for (const r of records) {
    const row = byType.get(r.request.type);
    if (!row) continue;
    row.total++;
    if (r.status === 'released') row.released++;
  }
  return rows;
}

export interface OutcomeSplit {
  released: number;
  declined: number;
  refused: number;
  other: number;
  waiting: number;
}

/** Where every request to a case or project ended up, for a stacked bar. */
export function selectOutcomes(records: readonly Release[]): OutcomeSplit {
  const o: OutcomeSplit = { released: 0, declined: 0, refused: 0, other: 0, waiting: 0 };
  for (const r of records) {
    switch (r.status) {
      case 'released':
        o.released++;
        break;
      case 'declined':
        o.declined++;
        break;
      case 'refused':
        o.refused++;
        break;
      case 'pending':
      case 'collecting':
        o.waiting++;
        break;
      default:
        o.other++;
    }
  }
  return o;
}
