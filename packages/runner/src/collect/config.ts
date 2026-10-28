import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { type ArgsFor, isPathAllowed, type Payload } from '@counterpart/protocol';
import { glob } from 'tinyglobby';
import type { CollectContext } from './context.js';

type ConfigPayload = Extract<Payload, { type: 'config' }>;

function looksBinary(buf: Buffer): boolean {
  const probe = buf.subarray(0, 1024);
  for (const byte of probe) if (byte === 0) return true;
  return false;
}

/**
 * Reads the requested config files. Every match is re-checked against the
 * allowlist so a glob cannot wander outside it.
 */
export async function collectConfig(
  ctx: CollectContext,
  args: ArgsFor<'config'>,
): Promise<ConfigPayload> {
  const matches = await glob(args.paths, {
    cwd: ctx.root,
    dot: true,
    onlyFiles: true,
    ignore: ['**/node_modules/**', '.counterpart/**', '.git/**'],
  });
  const files: ConfigPayload['files'] = [];
  for (const rel of matches.sort()) {
    if (!isPathAllowed(rel, ctx.config.configPaths)) continue;
    const abs = path.join(ctx.root, rel);
    const info = await stat(abs);
    const buf = await readFile(abs);
    if (looksBinary(buf)) {
      files.push({
        path: rel,
        content: '(binary file omitted)',
        bytes: info.size,
        truncated: true,
      });
      continue;
    }
    const limit = ctx.config.limits.maxBytes;
    const truncated = buf.length > limit;
    files.push({
      path: rel,
      content:
        buf.subarray(0, limit).toString('utf8') +
        (truncated ? '\n… truncated by the runner …' : ''),
      bytes: info.size,
      truncated,
    });
  }
  for (const requested of args.paths) {
    if (!requested.includes('*') && !matches.includes(requested)) {
      files.push({ path: requested, content: '(no such file)', bytes: 0, truncated: false });
    }
  }
  return { type: 'config', files };
}
