import { z } from 'zod';
import { EVIDENCE_TYPES, EvidenceTypeSchema } from './evidence.js';

/**
 * The shape of `.counterpart/runner.yaml`. This file is committed with the
 * project; it is the reporter's statement of what their agent may do for a
 * helpdesk.
 */

export const MenuEntrySchema = z.object({
  /** Stable name a helpdesk refers to, e.g. `test`, `build`, `typecheck`. */
  name: z
    .string()
    .regex(/^[a-z][a-z0-9:_-]*$/, 'menu names are lowercase, start with a letter, and use - _ :'),
  /** What the command is for, in one line. Shown to the helpdesk. */
  description: z.string().min(1).max(160),
  /** The command as an argv array. No shell expansion happens. */
  run: z.array(z.string().min(1)).min(1),
  /** Extra argv appended when the helpdesk asks for verbose output. */
  verbose: z.array(z.string().min(1)).default([]),
  /** Working directory relative to the project root. */
  cwd: z.string().default('.'),
  /** Per-entry timeout. Falls back to limits.timeoutMs. */
  timeoutMs: z.number().int().positive().optional(),
});
export type MenuEntry = z.infer<typeof MenuEntrySchema>;

export const ApprovalPolicySchema = z.enum(['automatic', 'ask']);

export const RedactionRuleSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  category: z.enum(['secret', 'email', 'ip', 'path', 'env', 'custom']).default('custom'),
  /** A JavaScript regular expression source. Flags are always `g`, plus `i` when `caseInsensitive`. */
  pattern: z.string().min(1),
  caseInsensitive: z.boolean().default(false),
  /** Replacement. `$1` style groups are allowed. Defaults to the category token. */
  replacement: z.string().optional(),
});
export type RedactionRule = z.infer<typeof RedactionRuleSchema>;

export const RunnerConfigSchema = z.object({
  version: z.literal(1),
  project: z.object({
    /** Slug used in case ids and cards. */
    name: z.string().regex(/^[a-z][a-z0-9-]*$/),
    /** The dependency this project reports against most often. Optional. */
    reportsAgainst: z.array(z.string()).default([]),
  }),
  menu: z.array(MenuEntrySchema).min(1),
  /** Paths (globs) a helpdesk may ask to read with E2. Nothing outside these is readable. */
  configPaths: z.array(z.string().min(1)).default([]),
  approvals: z
    .object(Object.fromEntries(EVIDENCE_TYPES.map((t) => [t, ApprovalPolicySchema.optional()])))
    .default({}),
  redaction: z
    .object({
      /** Extra rules applied after the built-in set. */
      rules: z.array(RedactionRuleSchema).default([]),
      /** Usernames to redact wherever they appear, beyond home-directory paths. */
      usernames: z.array(z.string().min(1)).default([]),
      /** Literal strings that must never leave the machine (project names, hostnames). */
      literals: z.array(z.string().min(1)).default([]),
      /** Keep the un-redacted record on disk for the Desk's side-by-side view. */
      keepRaw: z.boolean().default(true),
    })
    .default({ rules: [], usernames: [], literals: [], keepRaw: true }),
  limits: z
    .object({
      timeoutMs: z.number().int().positive().default(120_000),
      maxLines: z.number().int().positive().default(200),
      maxBytes: z
        .number()
        .int()
        .positive()
        .default(64 * 1024),
      /** How long a `collect` call may wait for an approval decision. */
      approvalWaitMs: z
        .number()
        .int()
        .positive()
        .default(10 * 60_000),
    })
    .default({ timeoutMs: 120_000, maxLines: 200, maxBytes: 64 * 1024, approvalWaitMs: 600_000 }),
});
export type RunnerConfig = z.infer<typeof RunnerConfigSchema>;

export const EvidenceTypeListSchema = z.array(EvidenceTypeSchema);
