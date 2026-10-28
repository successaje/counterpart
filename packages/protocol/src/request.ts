import { z } from 'zod';
import { EvidenceArgsSchema } from './evidence.js';

/**
 * Who asked. Helpdesks are agents; owners and maintainers are humans.
 */
export const PrincipalSchema = z.object({
  kind: z.enum(['agent', 'human']),
  /** Display name as it appears in the room, e.g. `cachekit-helpdesk`. */
  name: z.string().min(1).max(120),
  /** Which side of the case they are on. */
  side: z.enum(['reporter', 'project']),
});
export type Principal = z.infer<typeof PrincipalSchema>;

/**
 * A request the runner refused before it could be typed: an unknown evidence
 * type, or something the agent recognised as outside the menu. Kept so the
 * ledger shows what was asked, verbatim.
 */
export const OtherRequestSchema = z.object({
  type: z.literal('other'),
  args: z.object({
    asked: z.string().min(1).max(200),
    given: z.unknown().optional(),
  }),
});

export const RequestShapeSchema = z.union([EvidenceArgsSchema, OtherRequestSchema]);
export type RequestShape = z.infer<typeof RequestShapeSchema>;

export const EvidenceRequestSchema = z
  .object({
    id: z.string(),
    caseId: z.string(),
    requestedBy: PrincipalSchema,
    /** The request as it was phrased in the room, verbatim. Kept for the ledger. */
    requestText: z.string().min(1).max(4000),
    /** Room and thread where it was asked, if known. */
    thread: z.string().url().optional(),
    createdAt: z.string().datetime(),
  })
  .and(RequestShapeSchema);
export type EvidenceRequest = z.infer<typeof EvidenceRequestSchema>;

export const ApprovalDecisionSchema = z.enum([
  'automatic',
  'allowed-once',
  'allowed-for-case',
  'declined',
  'expired',
]);
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

export const ApprovalSchema = z.object({
  policy: z.enum(['automatic', 'ask']),
  decision: ApprovalDecisionSchema,
  /** `policy` when automatic; otherwise the surface the owner used. */
  via: z.enum(['policy', 'desk', 'cli', 'case-trust']),
  decidedAt: z.string().datetime(),
  note: z.string().max(500).optional(),
});
export type Approval = z.infer<typeof ApprovalSchema>;
