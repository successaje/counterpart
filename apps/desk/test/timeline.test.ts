import type { Case, Release } from '@counterpart/protocol';
import { describe, expect, it } from 'vitest';
import { caseTimeline, requestLabel } from '../src/lib/timeline.js';

const helpdesk = { kind: 'agent', name: 'cachekit-helpdesk', side: 'project' } as const;

const c: Case = {
  id: 'case_1',
  project: 'sample-app',
  summary: 'tests fail after upgrade',
  state: 'diagnosed',
  history: [
    { from: 'reported', to: 'evidence-requested', at: '2026-11-05T10:00:01.000Z', by: helpdesk },
    {
      from: 'evidence-requested',
      to: 'evidence-collected',
      at: '2026-11-05T10:00:09.000Z',
      by: helpdesk,
    },
    {
      from: 'evidence-collected',
      to: 'diagnosed',
      at: '2026-11-05T10:14:00.000Z',
      by: helpdesk,
      note: 'default dir moved',
    },
  ],
  recordIds: ['rec_1', 'rec_2'],
  trusted: [],
  createdAt: '2026-11-05T10:00:00.000Z',
  updatedAt: '2026-11-05T10:14:00.000Z',
};

function rec(
  id: string,
  extra: Partial<Release>,
  type: Release['request']['type'] = 'versions',
): Release {
  const base = {
    id: `req_${id}`,
    caseId: 'case_1',
    requestedBy: helpdesk,
    requestText: 'please',
    createdAt: '2026-11-05T10:00:01.000Z',
  };
  const request =
    type === 'command'
      ? { ...base, type: 'command' as const, args: { name: 'test', verbose: true } }
      : type === 'other'
        ? { ...base, type: 'other' as const, args: { asked: 'shell access' } }
        : { ...base, type: 'versions' as const, args: { packages: [] } };
  return {
    id,
    request,
    status: 'released',
    approval: null,
    released: null,
    redaction: null,
    createdAt: '2026-11-05T10:00:01.000Z',
    updatedAt: '2026-11-05T10:00:01.000Z',
    ...extra,
  } as Release;
}

describe('requestLabel', () => {
  it('names the evidence in the owner’s words', () => {
    expect(requestLabel(rec('a', {}))).toBe('E1 versions');
    expect(requestLabel(rec('b', {}, 'command'))).toBe('E3 command test');
    expect(requestLabel(rec('c', {}, 'other'))).toBe('something outside the menu (shell access)');
  });
});

describe('caseTimeline', () => {
  it('interleaves transitions and records in time order', () => {
    const records = [
      rec('rec_1', {
        approval: {
          policy: 'automatic',
          decision: 'automatic',
          via: 'policy',
          decidedAt: '2026-11-05T10:00:01.000Z',
        },
        finishedAt: '2026-11-05T10:00:03.000Z',
        redaction: { counts: { path: 2 }, total: 2, rulesApplied: ['home-path'] },
      }),
      rec(
        'rec_2',
        {
          status: 'released',
          approval: {
            policy: 'ask',
            decision: 'allowed-once',
            via: 'desk',
            decidedAt: '2026-11-05T10:00:06.000Z',
          },
          finishedAt: '2026-11-05T10:00:09.000Z',
          redaction: { counts: {}, total: 0, rulesApplied: [] },
        },
        'command',
      ),
      rec('rec_3', { status: 'refused', reason: 'not an evidence type' }, 'other'),
    ];
    const t = caseTimeline(c, records);
    expect(t.map((e) => e.title)).toEqual([
      'Case opened',
      'Asked for E1 versions',
      'Asked for E3 command test',
      'Refused something outside the menu (shell access)',
      'Allowed automatically by policy',
      'Reported → Evidence requested',
      'Released E1 versions',
      'Allowed once via desk',
      'Released E3 command test',
      'Evidence requested → Evidence collected',
      'Evidence collected → Diagnosed',
    ]);
    const released = t.filter((e) => e.crossed);
    expect(released).toHaveLength(2);
    expect(released[0]?.detail).toBe('redacted: 2 path');
    expect(t.find((e) => e.title === 'Allowed once via desk')?.by).toBe('you');
    expect(t.find((e) => e.title.startsWith('Refused'))?.detail).toBe('not an evidence type');
    expect(t.at(-1)?.detail).toBe('default dir moved');
  });

  it('records a decline and an expiry', () => {
    const t = caseTimeline(c, [
      rec('rec_1', {
        status: 'declined',
        approval: {
          policy: 'ask',
          decision: 'declined',
          via: 'cli',
          decidedAt: '2026-11-05T10:00:05.000Z',
          note: 'use the repro script',
        },
      }),
      rec('rec_2', { status: 'expired', updatedAt: '2026-11-05T10:10:00.000Z' }),
    ]);
    const declined = t.find((e) => e.title === 'Declined via cli');
    expect(declined?.tone).toBe('danger');
    expect(declined?.detail).toBe('use the repro script');
    expect(t.find((e) => e.title === 'Expired without a decision')?.at).toBe(
      '2026-11-05T10:10:00.000Z',
    );
    expect(t.some((e) => e.crossed)).toBe(false);
  });
});
