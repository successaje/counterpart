import path from 'node:path';
import type { ArgsFor, MenuEntry, Payload } from '@counterpart/protocol';
import { isInside } from '../config/paths.js';
import { RunnerError } from '../handle.js';
import { type CollectContext, execLimits, projectEnv } from './context.js';
import { execArgv } from './exec.js';

type CommandPayload = Extract<Payload, { type: 'command' }>;

export async function runMenuEntry(
  ctx: CollectContext,
  entry: MenuEntry,
  verbose: boolean,
): Promise<CommandPayload> {
  const cwd = path.resolve(ctx.root, entry.cwd);
  if (!isInside(ctx.root, cwd)) {
    throw new RunnerError('config', `menu entry "${entry.name}" has a cwd outside the project.`);
  }
  const argv = [...entry.run, ...(verbose ? entry.verbose : [])];
  const output = await execArgv(argv, {
    cwd,
    env: projectEnv(),
    ...execLimits(ctx, entry.timeoutMs),
  });
  return {
    type: 'command',
    name: entry.name,
    argv,
    cwd: path.relative(ctx.root, cwd) || '.',
    output,
  };
}

export async function collectCommand(
  ctx: CollectContext,
  args: ArgsFor<'command'>,
  entry: MenuEntry,
): Promise<CommandPayload> {
  return runMenuEntry(ctx, entry, args.verbose);
}
