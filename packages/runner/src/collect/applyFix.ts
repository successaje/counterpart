import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ArgsFor, MenuEntry, Payload } from '@counterpart/protocol';
import { runMenuEntry } from './command.js';
import { type CollectContext, execLimits } from './context.js';
import { execArgv } from './exec.js';

type ApplyFixPayload = Extract<Payload, { type: 'apply-fix' }>;

/**
 * `git apply` run inside a subdirectory silently ignores paths outside it and
 * resolves the rest against the repository root, so a patch written against
 * the project (as a helpdesk writes it) would do nothing in a monorepo. Run
 * from the toplevel with `--directory` instead. Outside a repository, git
 * apply behaves like patch(1) against the cwd.
 */
async function gitApplyContext(ctx: CollectContext): Promise<{ cwd: string; args: string[] }> {
  try {
    const top = await execArgv(['git', 'rev-parse', '--show-toplevel'], {
      cwd: ctx.root,
      ...execLimits(ctx, 10_000),
    });
    if (top.exitCode === 0) {
      // Both sides resolved, or a symlinked temp dir on macOS produces a bogus relative path.
      const toplevel = await realpath(top.stdout.trim());
      const rel = path.relative(toplevel, await realpath(ctx.root));
      return { cwd: toplevel, args: rel ? [`--directory=${rel}`] : [] };
    }
  } catch {
    // not a repository
  }
  return { cwd: ctx.root, args: [] };
}

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
    const git = await gitApplyContext(ctx);
    const check = await execArgv(['git', 'apply', '--check', '--recount', ...git.args, file], {
      cwd: git.cwd,
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
    const apply = await execArgv(['git', 'apply', '--recount', ...git.args, file], {
      cwd: git.cwd,
      ...limits,
    });
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
