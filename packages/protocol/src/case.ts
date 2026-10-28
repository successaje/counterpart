import { z } from 'zod';
import { PrincipalSchema } from './request.js';

export const CASE_STATES = [
  'reported',
  'evidence-requested',
  'evidence-collected',
  'diagnosed',
  'fix-proposed',
  'fix-verified',
  'filed',
  'resolved',
  'needs-human',
] as const;
export const CaseStateSchema = z.enum(CASE_STATES);
export type CaseState = z.infer<typeof CaseStateSchema>;

export const TERMINAL_STATES: ReadonlySet<CaseState> = new Set(['filed', 'resolved']);

/**
 * Allowed transitions. `needs-human` is reachable from any non-terminal state
 * and may return to the working states once a human has weighed in.
 */
const FORWARD: Readonly<Record<CaseState, readonly CaseState[]>> = {
  reported: ['evidence-requested', 'needs-human'],
  'evidence-requested': ['evidence-collected', 'needs-human'],
  'evidence-collected': ['evidence-requested', 'diagnosed', 'needs-human'],
  diagnosed: ['evidence-requested', 'fix-proposed', 'filed', 'needs-human'],
  'fix-proposed': ['fix-verified', 'evidence-requested', 'filed', 'needs-human'],
  'fix-verified': ['resolved', 'filed', 'needs-human'],
  filed: [],
  resolved: [],
  'needs-human': ['evidence-requested', 'diagnosed', 'fix-proposed', 'filed', 'resolved'],
};

export function canTransition(from: CaseState, to: CaseState): boolean {
  return FORWARD[from].includes(to);
}

export function nextStates(from: CaseState): readonly CaseState[] {
  return FORWARD[from];
}

export const CaseTransitionSchema = z.object({
  from: CaseStateSchema,
  to: CaseStateSchema,
  at: z.string().datetime(),
  by: PrincipalSchema,
  note: z.string().max(1000).optional(),
});
export type CaseTransition = z.infer<typeof CaseTransitionSchema>;

export const CaseSchema = z.object({
  id: z.string(),
  /** Project slug from runner.yaml. */
  project: z.string(),
  /** The dependency under suspicion, if known. */
  dependency: z.string().optional(),
  /** One line, as the reporter's agent summarised it. */
  summary: z.string().min(1).max(300),
  /** The helpdesk on the other side. */
  helpdesk: PrincipalSchema.optional(),
  /** Room or thread URL. */
  thread: z.string().url().optional(),
  state: CaseStateSchema,
  history: z.array(CaseTransitionSchema),
  recordIds: z.array(z.string()),
  /** Approvals granted "for this case", by evidence type. */
  trusted: z.array(z.string()),
  /** Where it ended up: an issue URL, or a sentence. */
  resolution: z.string().max(1000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Case = z.infer<typeof CaseSchema>;

export class CaseTransitionError extends Error {
  constructor(
    readonly from: CaseState,
    readonly to: CaseState,
  ) {
    super(`a case cannot move from ${from} to ${to}`);
    this.name = 'CaseTransitionError';
  }
}

export function transitionCase(
  c: Case,
  to: CaseState,
  by: z.infer<typeof PrincipalSchema>,
  note?: string,
  now: Date = new Date(),
): Case {
  if (!canTransition(c.state, to)) throw new CaseTransitionError(c.state, to);
  const at = now.toISOString();
  const entry: CaseTransition = note
    ? { from: c.state, to, at, by, note }
    : { from: c.state, to, at, by };
  return { ...c, state: to, history: [...c.history, entry], updatedAt: at };
}

export function isOpen(c: Case): boolean {
  return !TERMINAL_STATES.has(c.state);
}

export const CASE_STATE_LABEL: Readonly<Record<CaseState, string>> = {
  reported: 'Reported',
  'evidence-requested': 'Evidence requested',
  'evidence-collected': 'Evidence collected',
  diagnosed: 'Diagnosed',
  'fix-proposed': 'Fix proposed',
  'fix-verified': 'Fix verified',
  filed: 'Filed',
  resolved: 'Resolved',
  'needs-human': 'Needs a human',
};
