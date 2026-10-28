import type { Case, Release } from '@counterpart/protocol';
import { describe, expect, it } from 'vitest';
import { tokenFromInput } from '../src/lib/api.js';
import {
  applyEvent,
  initialState,
  reduce,
  selectByType,
  selectCases,
  selectOutcomes,
  selectPending,
  selectTotals,
} from '../src/lib/state.js';

const now = '2026-11-05T10:00:00.000Z';
const helpdesk = { kind: 'agent', name: 'cachekit-helpdesk', side: 'project' } as const;

function release(id: string, status: Release['status'], extra: Partial<Release> = {}): Release {
  return {
    id,
    request: {
      id: `req_${id}`,
      caseId: 'case_1',
      requestedBy: helpdesk,
      requestText: 'E1 please',
      createdAt: now,
      type: 'versions',
      args: { packages: [] },
    },
    status,
    approval: null,
    released: null,
    redaction: null,
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

const openCase: Case = {
  id: 'case_1',
  project: 'sample-app',
  summary: 'broken',
  state: 'reported',
  history: [],
  recordIds: [],
  trusted: [],
  createdAt: now,
  updatedAt: now,
};

describe('reducer', () => {
  it('hydrates and then applies live events on top', () => {
    let s = reduce(initialState, {
      type: 'hydrate',
      info: {} as never,
      cases: [openCase],
      records: [release('rec_a', 'released')],
    });
    expect(s.loaded).toBe(true);
    s = applyEvent(s, { type: 'approval.requested', record: release('rec_b', 'pending') });
    expect(selectPending(s).map((r) => r.id)).toEqual(['rec_b']);
    expect(s.arrivals).toEqual(['rec_b']);
    s = reduce(s, { type: 'deciding', recordId: 'rec_b', on: true });
    expect(s.deciding.rec_b).toBe(true);
    s = applyEvent(s, { type: 'record.updated', record: release('rec_b', 'released') });
    expect(selectPending(s)).toHaveLength(0);
    expect(s.deciding.rec_b).toBeUndefined();
    s = applyEvent(s, { type: 'case.updated', case: { ...openCase, state: 'resolved' } });
    expect(selectCases(s, true)).toHaveLength(0);
    expect(selectCases(s, false)).toHaveLength(1);
  });

  it('does not create a new state object for a repeated connection value', () => {
    const s = reduce(initialState, { type: 'connection', connection: 'connecting' });
    expect(s).toBe(initialState);
  });
});

describe('selectTotals', () => {
  it('sums statuses and redaction categories', () => {
    const t = selectTotals([
      release('a', 'released', {
        redaction: { counts: { secret: 2, path: 1 }, total: 3, rulesApplied: [] },
      }),
      release('b', 'released', { redaction: { counts: { email: 1 }, total: 1, rulesApplied: [] } }),
      release('c', 'refused'),
      release('d', 'declined'),
      release('e', 'expired'),
    ]);
    expect(t).toEqual({
      released: 2,
      refused: 1,
      declined: 1,
      other: 1,
      redactions: { secret: 2, path: 1, email: 1 },
      redactionTotal: 4,
    });
  });
});

describe('tokenFromInput', () => {
  it('accepts a Desk link or a bare token', () => {
    expect(tokenFromInput('http://127.0.0.1:4747/#token=abcDEF123_-abcDEF123_-xyz')).toBe(
      'abcDEF123_-abcDEF123_-xyz',
    );
    expect(tokenFromInput('  abcDEF123_-abcDEF123_-xyz ')).toBe('abcDEF123_-abcDEF123_-xyz');
    expect(tokenFromInput('short')).toBeNull();
    expect(tokenFromInput('')).toBeNull();
  });
});

describe('selectByType and selectOutcomes', () => {
  it('count requests per evidence type and by where they ended up', () => {
    const records = [
      release('a', 'released'),
      release('b', 'released'),
      release('c', 'declined'),
      release('d', 'pending'),
    ];
    const byType = selectByType(records);
    expect(byType[0]).toMatchObject({ code: 'E1', total: 4, released: 2 });
    expect(byType.at(-1)).toMatchObject({ type: 'other', total: 0 });
    expect(selectOutcomes(records)).toEqual({
      released: 2,
      declined: 1,
      refused: 0,
      other: 0,
      waiting: 1,
    });
  });
});
