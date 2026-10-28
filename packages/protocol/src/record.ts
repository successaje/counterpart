import { z } from 'zod';
import { ApprovalSchema, EvidenceRequestSchema } from './request.js';

/**
 * Payloads, one per evidence type. `raw` holds what the runner saw;
 * `released` holds what may leave the machine.
 */

export const OutputSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int().nullable(),
  durationMs: z.number().int().nonnegative(),
  /** True when stdout or stderr were cut at the configured limits. */
  truncated: z.boolean(),
  timedOut: z.boolean(),
});
export type Output = z.infer<typeof OutputSchema>;

export const VersionsPayloadSchema = z.object({
  type: z.literal('versions'),
  platform: z.string(),
  runtime: z.record(z.string(), z.string()),
  packageManager: z.string().nullable(),
  packages: z.array(
    z.object({
      name: z.string(),
      version: z.string(),
      /** Where it was found: `dependencies`, `devDependencies`, a lockfile, or a path. */
      source: z.string(),
    }),
  ),
});

export const ConfigPayloadSchema = z.object({
  type: z.literal('config'),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
      bytes: z.number().int().nonnegative(),
      truncated: z.boolean(),
    }),
  ),
});

export const CommandPayloadSchema = z.object({
  type: z.literal('command'),
  name: z.string(),
  argv: z.array(z.string()),
  cwd: z.string(),
  output: OutputSchema,
});

export const ReproPayloadSchema = z.object({
  type: z.literal('repro'),
  script: z.string(),
  shell: z.string(),
  sandbox: z.string(),
  output: OutputSchema,
});

export const DiffPayloadSchema = z.object({
  type: z.literal('diff'),
  paths: z.array(z.string()),
  stat: z.string(),
  commits: z.array(z.object({ sha: z.string(), subject: z.string(), when: z.string() })),
  dirty: z.boolean(),
});

export const ApplyFixPayloadSchema = z.object({
  type: z.literal('apply-fix'),
  description: z.string(),
  patch: z.string(),
  applied: z.boolean(),
  applyOutput: z.string(),
  verify: CommandPayloadSchema.nullable(),
});

export const PayloadSchema = z.discriminatedUnion('type', [
  VersionsPayloadSchema,
  ConfigPayloadSchema,
  CommandPayloadSchema,
  ReproPayloadSchema,
  DiffPayloadSchema,
  ApplyFixPayloadSchema,
]);
export type Payload = z.infer<typeof PayloadSchema>;

export const RedactionReportSchema = z.object({
  counts: z.record(z.string(), z.number().int().nonnegative()),
  total: z.number().int().nonnegative(),
  rulesApplied: z.array(z.string()),
});
export type RedactionReport = z.infer<typeof RedactionReportSchema>;

export const RecordStatusSchema = z.enum([
  'pending', // waiting for approval
  'collecting',
  'released',
  'declined',
  'refused', // outside the menu, never reached approval
  'failed',
  'expired',
]);
export type RecordStatus = z.infer<typeof RecordStatusSchema>;

export const EvidenceRecordSchema = z.object({
  id: z.string(),
  request: EvidenceRequestSchema,
  status: RecordStatusSchema,
  approval: ApprovalSchema.nullable(),
  /** Set when status is refused or failed. Written for a human. */
  reason: z.string().max(2000).optional(),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
  raw: PayloadSchema.nullable(),
  released: PayloadSchema.nullable(),
  redaction: RedactionReportSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

/**
 * The view of a record that may leave the machine. It never carries `raw`.
 */
export const ReleaseSchema = EvidenceRecordSchema.omit({ raw: true });
export type Release = z.infer<typeof ReleaseSchema>;

export function toRelease(record: EvidenceRecord): Release {
  const { raw: _raw, ...release } = record;
  return release;
}
