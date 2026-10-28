import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { RunnerConfig } from '@counterpart/protocol';
import YAML from 'yaml';
import { execArgv } from '../src/collect/exec.js';

export const owner = { kind: 'human', name: 'dev', side: 'reporter' } as const;
export const helpdesk = { kind: 'agent', name: 'cachekit-helpdesk', side: 'project' } as const;

export interface Fixture {
  root: string;
  cleanup(): Promise<void>;
}

export const baseConfig: RunnerConfig = {
  version: 1,
  project: { name: 'sample-app', reportsAgainst: ['cachekit'] },
  menu: [
    {
      name: 'greet',
      description: 'Print the greeting file',
      run: ['cat', 'greeting.txt'],
      verbose: [],
      cwd: '.',
    },
    {
      name: 'leak',
      description: 'Prints things that must be redacted',
      run: ['sh', 'leak.sh'],
      verbose: ['verbose'],
      cwd: '.',
    },
    {
      name: 'slow',
      description: 'Sleeps longer than its timeout',
      run: ['sleep', '5'],
      verbose: [],
      cwd: '.',
      timeoutMs: 300,
    },
  ],
  configPaths: ['.env', 'config/*.yaml'],
  approvals: {},
  redaction: { rules: [], usernames: [], literals: ['acme-internal'], keepRaw: true },
  limits: { timeoutMs: 10_000, maxLines: 50, maxBytes: 16 * 1024, approvalWaitMs: 2_000 },
};

/**
 * A throwaway project: git repo, package.json, a greeting file, a leaky
 * script, an env file and a runner.yaml.
 */
export async function makeProject(config: RunnerConfig = baseConfig): Promise<Fixture> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'counterpart-test-'));
  await mkdir(path.join(root, '.counterpart'), { recursive: true });
  await mkdir(path.join(root, 'config'), { recursive: true });
  await mkdir(path.join(root, 'node_modules', 'cachekit'), { recursive: true });
  await writeFile(path.join(root, '.counterpart', 'runner.yaml'), YAML.stringify(config));
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'sample-app',
      scripts: { test: 'vitest run', build: 'tsc' },
      dependencies: { cachekit: '^3.2.0', 'cachekit-s3': '^0.4.0' },
    }),
  );
  await writeFile(path.join(root, 'package-lock.json'), '{}');
  await writeFile(
    path.join(root, 'node_modules', 'cachekit', 'package.json'),
    JSON.stringify({ version: '3.2.0' }),
  );
  await writeFile(path.join(root, 'greeting.txt'), 'hello\n');
  await writeFile(
    path.join(root, 'leak.sh'),
    'echo "running for alice@example.com from /Users/alice/app at acme-internal"\necho "API_KEY=sk-abcdefghijklmnopqrstuvwxyz"\n[ "$1" = "verbose" ] && echo "verbose on"\nexit 0\n',
  );
  await writeFile(path.join(root, '.env'), 'DATABASE_URL=postgres://u:p@h/db\nFLAG=1\n');
  await writeFile(path.join(root, 'config', 'cache.yaml'), 'dir: /Users/alice/.cache\n');
  await writeFile(path.join(root, 'secret.yaml'), 'nope\n');
  const git = (args: string[]) =>
    execArgv(['git', ...args], { cwd: root, timeoutMs: 10_000, maxLines: 50, maxBytes: 8192 });
  await git(['init', '-q', '-b', 'main']);
  await git(['-c', 'user.email=t@t', '-c', 'user.name=t', 'add', '-A']);
  await git(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'initial']);
  await writeFile(path.join(root, 'greeting.txt'), 'hello world\n');
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

export const GREETING_PATCH = `diff --git a/greeting.txt b/greeting.txt
--- a/greeting.txt
+++ b/greeting.txt
@@ -1 +1 @@
-hello world
+hello, counterpart
`;
