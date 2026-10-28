import { describe, expect, it } from 'vitest';
import {
  CASE_STATES,
  type Case,
  CaseTransitionError,
  canTransition,
  isOpen,
  nextStates,
  transitionCase,
} from '../src/case.js';

const owner = { kind: 'human', name: 'dev', side: 'reporter' } as const;

function fresh(): Case {
  const now = new Date().toISOString();
  return {
    id: 'case_0000000000',
    project: 'sample-app',
    summary: 'cachekit-s3 cannot find the cache directory after upgrading to 3.2.0',
    state: 'reported',
    history: [],
    recordIds: [],
    trusted: [],
    createdAt: now,
    updatedAt: now,
  };
}

describe('case transitions', () => {
  it('walks the happy path to resolved', () => {
    let c = fresh();
    for (const to of [
      'evidence-requested',
      'evidence-collected',
      'diagnosed',
      'fix-proposed',
      'fix-verified',
      'resolved',
    ] as const) {
      c = transitionCase(c, to, owner, undefined, new Date('2026-11-05T10:00:00Z'));
      expect(c.state).toBe(to);
    }
    expect(c.history).toHaveLength(6);
    expect(isOpen(c)).toBe(false);
  });

  it('refuses to skip ahead', () => {
    expect(() => transitionCase(fresh(), 'resolved', owner)).toThrow(CaseTransitionError);
    expect(canTransition('reported', 'fix-verified')).toBe(false);
  });

  it('allows needs-human from every working state and back', () => {
    for (const s of CASE_STATES.filter(
      (s) => s !== 'filed' && s !== 'resolved' && s !== 'needs-human',
    )) {
      expect(canTransition(s, 'needs-human')).toBe(true);
    }
    expect(nextStates('needs-human')).toContain('evidence-requested');
  });

  it('keeps terminal states terminal', () => {
    expect(nextStates('filed')).toHaveLength(0);
    expect(nextStates('resolved')).toHaveLength(0);
  });

  it('records a note when one is given and omits the key otherwise', () => {
    const c = transitionCase(fresh(), 'evidence-requested', owner, 'helpdesk asked for E1');
    expect(c.history[0]?.note).toBe('helpdesk asked for E1');
    const d = transitionCase(fresh(), 'evidence-requested', owner);
    expect('note' in (d.history[0] ?? {})).toBe(false);
  });
});
