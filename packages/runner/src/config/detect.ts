import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { MenuEntry, RunnerConfig } from '@counterpart/protocol';
import { glob } from 'tinyglobby';
import { exists } from './paths.js';

/**
 * Looks at a project and proposes a runner.yaml. The proposal is conservative:
 * only scripts that are obviously read-only checks make it onto the menu, and
 * only well-known config locations become readable.
 */

export type PackageManager =
  | 'pnpm'
  | 'npm'
  | 'yarn'
  | 'bun'
  | 'pip'
  | 'poetry'
  | 'uv'
  | 'cargo'
  | 'go';

export interface Detection {
  packageManager: PackageManager | null;
  menu: MenuEntry[];
  configPaths: string[];
  dependencies: string[];
  notes: string[];
}

const SAFE_SCRIPTS: Record<string, string> = {
  test: 'Run the test suite',
  'test:unit': 'Run unit tests',
  build: 'Build the project',
  typecheck: 'Type-check the project',
  lint: 'Lint the project',
  check: 'Run all checks',
};

const RUNNER_VERBOSE: Record<string, string[]> = {
  vitest: ['--reporter=verbose'],
  jest: ['--verbose'],
  mocha: ['--reporter', 'spec'],
  pytest: ['-vv'],
};

const COMMON_CONFIG = [
  '.env',
  '.env.example',
  'config/**',
  'tsconfig.json',
  'vite.config.*',
  'vitest.config.*',
  'jest.config.*',
  'next.config.*',
  'pyproject.toml',
  'settings.toml',
];

async function readJson(p: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await readFile(p, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function detectProject(root: string): Promise<Detection> {
  const notes: string[] = [];
  const menu: MenuEntry[] = [];
  const dependencies: string[] = [];
  let packageManager: PackageManager | null = null;

  const pkg = await readJson(path.join(root, 'package.json'));
  if (pkg) {
    if (await exists(path.join(root, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
    else if (await exists(path.join(root, 'yarn.lock'))) packageManager = 'yarn';
    else if (
      (await exists(path.join(root, 'bun.lockb'))) ||
      (await exists(path.join(root, 'bun.lock')))
    )
      packageManager = 'bun';
    else packageManager = 'npm';

    const scripts = (pkg.scripts ?? {}) as Record<string, string>;
    const deps = {
      ...((pkg.dependencies ?? {}) as Record<string, string>),
      ...((pkg.devDependencies ?? {}) as Record<string, string>),
    };
    dependencies.push(...Object.keys(deps));

    for (const [name, description] of Object.entries(SAFE_SCRIPTS)) {
      const body = scripts[name];
      if (!body) continue;
      const runner = Object.keys(RUNNER_VERBOSE).find((r) => body.includes(r));
      const verbose = runner ? (RUNNER_VERBOSE[runner] ?? []) : [];
      // npm needs `--` before extra arguments; pnpm, yarn and bun pass them through.
      const run =
        packageManager === 'npm' && verbose.length > 0
          ? ['npm', 'run', name, '--']
          : [packageManager ?? 'npm', 'run', name];
      menu.push({ name, description, run, verbose, cwd: '.' });
    }
    if (menu.length === 0)
      notes.push('No test, build, typecheck or lint script found; add menu entries by hand.');
  }

  if (await exists(path.join(root, 'pyproject.toml'))) {
    if (await exists(path.join(root, 'uv.lock'))) packageManager = 'uv';
    else if (await exists(path.join(root, 'poetry.lock'))) packageManager = 'poetry';
    else packageManager = packageManager ?? 'pip';
    const prefix =
      packageManager === 'uv'
        ? ['uv', 'run']
        : packageManager === 'poetry'
          ? ['poetry', 'run']
          : [];
    menu.push({
      name: 'test',
      description: 'Run pytest',
      run: [...prefix, 'pytest'],
      verbose: ['-vv'],
      cwd: '.',
    });
  }

  if (await exists(path.join(root, 'Cargo.toml'))) {
    packageManager = 'cargo';
    menu.push({
      name: 'test',
      description: 'cargo test',
      run: ['cargo', 'test'],
      verbose: ['--', '--nocapture'],
      cwd: '.',
    });
    menu.push({
      name: 'build',
      description: 'cargo build',
      run: ['cargo', 'build'],
      verbose: ['--verbose'],
      cwd: '.',
    });
  }

  if (await exists(path.join(root, 'go.mod'))) {
    packageManager = 'go';
    menu.push({
      name: 'test',
      description: 'go test',
      run: ['go', 'test', './...'],
      verbose: ['-v'],
      cwd: '.',
    });
    menu.push({
      name: 'build',
      description: 'go build',
      run: ['go', 'build', './...'],
      verbose: ['-v'],
      cwd: '.',
    });
  }

  // Only propose paths that exist today; the owner can widen the list by hand.
  const configPaths: string[] = [];
  for (const candidate of COMMON_CONFIG) {
    const present = candidate.includes('*')
      ? (
          await glob(candidate, {
            cwd: root,
            dot: true,
            onlyFiles: true,
            ignore: ['**/node_modules/**'],
          })
        ).length > 0
      : await exists(path.join(root, candidate));
    if (present) configPaths.push(candidate);
  }

  if (menu.length === 0) {
    menu.push({
      name: 'noop',
      description: 'Placeholder: replace with a real command',
      run: ['true'],
      verbose: [],
      cwd: '.',
    });
    notes.push('No known project type detected; the menu has a placeholder entry.');
  }

  return { packageManager, menu, configPaths, dependencies, notes };
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/^@[^/]+\//, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^[^a-z]+/, '');
  return slug || 'project';
}

export function proposeConfig(projectName: string, detection: Detection): RunnerConfig {
  return {
    version: 1,
    project: { name: slugify(projectName), reportsAgainst: [] },
    menu: detection.menu,
    configPaths: detection.configPaths,
    approvals: {},
    redaction: { rules: [], usernames: [], literals: [], keepRaw: true },
    limits: { timeoutMs: 120_000, maxLines: 200, maxBytes: 64 * 1024, approvalWaitMs: 600_000 },
  };
}
