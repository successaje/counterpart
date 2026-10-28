import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ArgsFor, Payload } from '@counterpart/protocol';
import { exists } from '../config/paths.js';
import { type CollectContext, execLimits } from './context.js';
import { execArgv } from './exec.js';

type VersionsPayload = Extract<Payload, { type: 'versions' }>;

async function json(p: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await readFile(p, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function toolVersion(ctx: CollectContext, argv: string[]): Promise<string | null> {
  try {
    const out = await execArgv(argv, { cwd: ctx.root, ...execLimits(ctx, 10_000) });
    const line = out.stdout.trim().split('\n')[0] ?? '';
    return out.exitCode === 0 && line ? line.replace(/^v/, '') : null;
  } catch {
    return null;
  }
}

export async function collectVersions(
  ctx: CollectContext,
  args: ArgsFor<'versions'>,
): Promise<VersionsPayload> {
  const runtime: Record<string, string> = {};
  const packages: VersionsPayload['packages'] = [];
  let packageManager: string | null = null;
  const wanted = new Set(args.packages);

  const pkg = await json(path.join(ctx.root, 'package.json'));
  if (pkg) {
    runtime.node = process.versions.node;
    if (await exists(path.join(ctx.root, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
    else if (await exists(path.join(ctx.root, 'yarn.lock'))) packageManager = 'yarn';
    else if (
      (await exists(path.join(ctx.root, 'bun.lockb'))) ||
      (await exists(path.join(ctx.root, 'bun.lock')))
    )
      packageManager = 'bun';
    else packageManager = 'npm';
    const pmVersion = await toolVersion(ctx, [packageManager, '--version']);
    if (pmVersion) runtime[packageManager] = pmVersion;

    const declared: Record<string, string> = {
      ...((pkg.dependencies ?? {}) as Record<string, string>),
      ...((pkg.devDependencies ?? {}) as Record<string, string>),
    };
    const names = wanted.size ? [...wanted] : Object.keys(declared);
    for (const name of names) {
      const installed = await json(path.join(ctx.root, 'node_modules', name, 'package.json'));
      if (installed && typeof installed.version === 'string') {
        packages.push({ name, version: installed.version, source: 'node_modules' });
      } else if (declared[name]) {
        packages.push({
          name,
          version: declared[name] ?? '',
          source: 'package.json (declared, not installed)',
        });
      } else if (wanted.has(name)) {
        packages.push({ name, version: 'not found', source: 'not declared, not installed' });
      }
    }
  }

  if (await exists(path.join(ctx.root, 'pyproject.toml'))) {
    const py = await toolVersion(ctx, ['python3', '--version']);
    if (py) runtime.python = py.replace(/^Python\s+/i, '');
    if (await exists(path.join(ctx.root, 'uv.lock'))) packageManager = packageManager ?? 'uv';
    else if (await exists(path.join(ctx.root, 'poetry.lock')))
      packageManager = packageManager ?? 'poetry';
  }
  if (await exists(path.join(ctx.root, 'requirements.txt'))) {
    const lines = (await readFile(path.join(ctx.root, 'requirements.txt'), 'utf8')).split('\n');
    for (const line of lines) {
      const m = line.trim().match(/^([A-Za-z0-9_.-]+)\s*([=<>!~]+\s*[^\s#]+)?/);
      if (!m?.[1] || line.trim().startsWith('#')) continue;
      if (wanted.size && !wanted.has(m[1])) continue;
      packages.push({
        name: m[1],
        version: (m[2] ?? 'unpinned').replace(/\s+/g, ''),
        source: 'requirements.txt',
      });
    }
  }

  return {
    type: 'versions',
    platform: `${os.type()} ${os.release()} ${os.arch()}`,
    runtime,
    packageManager,
    packages,
  };
}
