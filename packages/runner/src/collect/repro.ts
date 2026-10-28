import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ArgsFor, Payload } from '@counterpart/protocol';
import { RunnerError } from '../handle.js';
import { type CollectContext, execLimits } from './context.js';
import { execArgv } from './exec.js';

type ReproPayload = Extract<Payload, { type: 'repro' }>;

const EXT: Record<ArgsFor<'repro'>['shell'], string> = {
  sh: 'sh',
  bash: 'sh',
  node: 'mjs',
  python3: 'py',
};

/**
 * Runs a posted script verbatim in a fresh temporary directory, with the
 * network denied and the environment reduced to PATH and a few locale
 * variables. The script never sees the project checkout.
 */
export async function collectRepro(
  ctx: CollectContext,
  args: ArgsFor<'repro'>,
): Promise<ReproPayload> {
  const adapter = ctx.sandbox.adapter;
  if (!adapter) {
    throw new RunnerError(
      'unavailable',
      `E4 needs a network sandbox: ${ctx.sandbox.reason ?? 'none available'}`,
    );
  }
  const dir = await mkdtemp(path.join(os.tmpdir(), 'counterpart-repro-'));
  try {
    const file = path.join(dir, `repro.${EXT[args.shell]}`);
    await writeFile(file, args.script, { encoding: 'utf8', mode: 0o600 });
    const argv = adapter.wrap([args.shell, file]);
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH ?? '/usr/bin:/bin',
      HOME: dir,
      TMPDIR: dir,
      LANG: process.env.LANG ?? 'C.UTF-8',
      NO_COLOR: '1',
      COUNTERPART_SANDBOX: '1',
    };
    const output = await execArgv(argv, { cwd: dir, env, ...execLimits(ctx) });
    return { type: 'repro', script: args.script, shell: args.shell, sandbox: adapter.name, output };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
