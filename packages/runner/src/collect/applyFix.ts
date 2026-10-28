import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ArgsFor, MenuEntry, Payload } from '@counterpart/protocol';
import { runMenuEntry } from './command.js';
import { type CollectContext, execLimits } from './context.js';
import { execArgv } from './exec.js';

type ApplyFixPayload = Extract<Payload, { type: 'apply-fix' }>;

/**
 * Applies a unified diff to the working tree with `git apply`, then re-runs the
 * named menu entry. Nothing is committed; the record carries the patch so the
 * owner can reverse it with `git apply -R`.
 */
export async function collectApplyFix(
  ctx: CollectContext,
  args: ArgsFor<'apply-fix'>,
  verifyEntry: MenuEntry,
): Promise<ApplyFixPayload> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'counterpart-patch-'));
  try {
    const file = path.join(dir, 'fix.patch');
    await writeFile(file, args.patch.endsWith('\n') ? args.patch : `${args.patch}\n`, 'utf8');
    const limits = execLimits(ctx, 30_000);
    const check = await execArgv(['git', 'apply', '--check', '--recount', file], {
      cwd: ctx.root,
      ...limits,
    });
    if (check.exitCode !== 0) {
      return {
        type: 'apply-fix',
        description: args.description,
        patch: args.patch,
        applied: false,
        applyOutput: `git apply --check failed:\n${check.stderr.trim() || check.stdout.trim()}`,
        verify: null,
      };
    }
    const apply = await execArgv(['git', 'apply', '--recount', file], { cwd: ctx.root, ...limits });
    if (apply.exitCode !== 0) {
      return {
        type: 'apply-fix',
        description: args.description,
        patch: args.patch,
        applied: false,
        applyOutput: `git apply failed:\n${apply.stderr.trim()}`,
        verify: null,
      };
    }
    const verify = await runMenuEntry(ctx, verifyEntry, true);
    return {
      type: 'apply-fix',
      description: args.description,
      patch: args.patch,
      applied: true,
      applyOutput: 'applied to the working tree (not committed); reverse with `git apply -R`',
      verify,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
