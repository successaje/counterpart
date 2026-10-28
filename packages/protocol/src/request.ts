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
  .and(EvidenceArgsSchema);
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
