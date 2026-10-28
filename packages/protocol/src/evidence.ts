import { z } from 'zod';

/**
 * The six evidence types a helpdesk may request. Anything else is refused.
 */
export const EVIDENCE_TYPES = [
  'versions',
  'config',
  'command',
  'repro',
  'diff',
  'apply-fix',
] as const;
export const EvidenceTypeSchema = z.enum(EVIDENCE_TYPES);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export type ApprovalPolicy = 'automatic' | 'ask';

export interface EvidenceTypeInfo {
  readonly type: EvidenceType;
  /** Short code used in rooms and docs, e.g. E3. */
  readonly code: `E${1 | 2 | 3 | 4 | 5 | 6}`;
  readonly title: string;
  readonly summary: string;
  /** Whether collecting this evidence executes project code or a posted script. */
  readonly executes: boolean;
  /** Whether collecting this evidence changes the working tree. */
  readonly mutates: boolean;
  readonly defaultApproval: ApprovalPolicy;
}

export const EVIDENCE_INFO: Readonly<Record<EvidenceType, EvidenceTypeInfo>> = {
  versions: {
    type: 'versions',
    code: 'E1',
    title: 'Versions',
    summary: 'Runtime, package manager and the versions of the library and its plugins.',
    executes: false,
    mutates: false,
    defaultApproval: 'automatic',
  },
  config: {
    type: 'config',
    code: 'E2',
    title: 'Config',
    summary: "The project's configuration for the library, with secrets redacted.",
    executes: false,
    mutates: false,
    defaultApproval: 'ask',
  },
  command: {
    type: 'command',
    code: 'E3',
    title: 'Command',
    summary: 'Run one named command from the menu, with its verbose flag, and share the output.',
    executes: true,
    mutates: false,
    defaultApproval: 'ask',
  },
  repro: {
    type: 'repro',
    code: 'E4',
    title: 'Reproduction',
    summary:
      'Run a script the helpdesk posted, verbatim, in a temporary directory with network denied.',
    executes: true,
    mutates: false,
    defaultApproval: 'ask',
  },
  diff: {
    type: 'diff',
    code: 'E5',
    title: 'Recent changes',
    summary: 'The diff summary and the last commits that touched the failing path.',
    executes: false,
    mutates: false,
    defaultApproval: 'automatic',
  },
  'apply-fix': {
    type: 'apply-fix',
    code: 'E6',
    title: 'Apply fix',
    summary: 'Apply a posted patch or config change, then re-run the failing command.',
    executes: true,
    mutates: true,
    defaultApproval: 'ask',
  },
};

export function evidenceInfo(type: EvidenceType): EvidenceTypeInfo {
  return EVIDENCE_INFO[type];
}

export function evidenceTypeFromCode(code: string): EvidenceType | undefined {
  const upper = code.trim().toUpperCase();
  return EVIDENCE_TYPES.find((t) => EVIDENCE_INFO[t].code === upper);
}

/**
 * Arguments for each evidence type. These are what a helpdesk may specify.
 * The runner validates them against the menu before anything runs.
 */
export const VersionsArgsSchema = z.object({
  /** Package names to report. Empty means everything the runner can see. */
  packages: z.array(z.string().min(1)).default([]),
});

export const ConfigArgsSchema = z.object({
  /** Paths or globs, relative to the project root. Must be covered by the menu's config paths. */
  paths: z.array(z.string().min(1)).min(1),
});

export const CommandArgsSchema = z.object({
  /** Name of a menu entry. */
  name: z.string().min(1),
  /** Request the entry's verbose variant. */
  verbose: z.boolean().default(true),
});

export const ReproArgsSchema = z.object({
  /** The script to run, verbatim. */
  script: z.string().min(1),
  /** Shell to run it with. */
  shell: z.enum(['sh', 'bash', 'node', 'python3']).default('sh'),
});

export const DiffArgsSchema = z.object({
  /** Paths to scope the diff and log to. Empty means the whole repository. */
  paths: z.array(z.string().min(1)).default([]),
  /** Number of recent commits to include. */
  commits: z.number().int().min(1).max(20).default(5),
});

export const ApplyFixArgsSchema = z.object({
  /** A unified diff to apply with git. */
  patch: z.string().min(1),
  /** Menu entry to re-run after applying. */
  verifyWith: z.string().min(1),
  /** One-line description of what the patch does. */
  description: z.string().min(1).max(200),
});

export const EvidenceArgsSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('versions'), args: VersionsArgsSchema }),
  z.object({ type: z.literal('config'), args: ConfigArgsSchema }),
  z.object({ type: z.literal('command'), args: CommandArgsSchema }),
  z.object({ type: z.literal('repro'), args: ReproArgsSchema }),
  z.object({ type: z.literal('diff'), args: DiffArgsSchema }),
  z.object({ type: z.literal('apply-fix'), args: ApplyFixArgsSchema }),
]);
export type EvidenceArgs = z.infer<typeof EvidenceArgsSchema>;
export type ArgsFor<T extends EvidenceType> = Extract<EvidenceArgs, { type: T }>['args'];
