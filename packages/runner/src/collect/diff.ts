import type { ArgsFor, Payload } from '@counterpart/protocol';
import { type CollectContext, execLimits } from './context.js';
import { execArgv } from './exec.js';

type DiffPayload = Extract<Payload, { type: 'diff' }>;

async function git(ctx: CollectContext, args: string[]): Promise<{ ok: boolean; text: string }> {
  try {
    const out = await execArgv(['git', ...args], { cwd: ctx.root, ...execLimits(ctx, 30_000) });
    return { ok: out.exitCode === 0, text: out.exitCode === 0 ? out.stdout : out.stderr };
  } catch (err) {
    return { ok: false, text: (err as Error).message };
  }
}

export async function collectDiff(
  ctx: CollectContext,
  args: ArgsFor<'diff'>,
): Promise<DiffPayload> {
  const inside = await git(ctx, ['rev-parse', '--is-inside-work-tree']);
  if (!inside.ok) {
    return {
      type: 'diff',
      paths: args.paths,
      stat: 'not a git repository',
      commits: [],
      dirty: false,
    };
  }
  const scope = args.paths.length ? ['--', ...args.paths] : [];
  const stat = await git(ctx, ['diff', '--stat', 'HEAD', ...scope]);
  const log = await git(ctx, ['log', `-n${args.commits}`, '--format=%h%x09%cr%x09%s', ...scope]);
  const status = await git(ctx, ['status', '--porcelain', ...scope]);
  const commits = log.ok
    ? log.text
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [sha = '', when = '', ...rest] = line.split('\t');
          return { sha, when, subject: rest.join('\t') };
        })
    : [];
  return {
    type: 'diff',
    paths: args.paths,
    stat: stat.ok ? stat.text.trim() || 'no changes against HEAD' : stat.text.trim(),
    commits,
    dirty: status.ok && status.text.trim().length > 0,
  };
}
