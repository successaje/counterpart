#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
/**
 * Development harness for the Desk.
 *
 * Creates a throwaway project with a runner.yaml, starts a Counterpart server
 * for it, seeds two cases with realistic records (released, refused, declined
 * and a request waiting for approval) and prints the Desk link. Run the Vite
 * dev server next to it; the proxy points at the port printed here.
 *
 *   node scripts/desk-dev-server.mjs
 *   pnpm --filter @counterpart/desk dev
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { connect, exists } from '@counterpart/runner';
import YAML from 'yaml';

const root = await mkdtemp(path.join(os.tmpdir(), 'counterpart-desk-dev-'));
await mkdir(path.join(root, '.counterpart'), { recursive: true });
await mkdir(path.join(root, 'config'), { recursive: true });
await mkdir(path.join(root, 'node_modules', 'cachekit'), { recursive: true });
await mkdir(path.join(root, 'node_modules', 'cachekit-s3'), { recursive: true });

await writeFile(
  path.join(root, '.counterpart', 'runner.yaml'),
  YAML.stringify({
    version: 1,
    project: { name: 'sample-app', reportsAgainst: ['cachekit'] },
    menu: [
      {
        name: 'test',
        description: 'Run the test suite',
        run: ['sh', 'test.sh'],
        verbose: ['--verbose'],
        cwd: '.',
      },
      {
        name: 'build',
        description: 'Build the app',
        run: ['sh', '-c', 'echo "built 14 modules"'],
        verbose: [],
        cwd: '.',
      },
    ],
    configPaths: ['.env', 'config/*.yaml'],
    approvals: {},
    redaction: { rules: [], usernames: [], literals: ['acme-internal'], keepRaw: true },
    limits: { timeoutMs: 20000, maxLines: 120, maxBytes: 32768, approvalWaitMs: 3_600_000 },
  }),
);
await writeFile(
  path.join(root, 'package.json'),
  JSON.stringify(
    {
      name: 'sample-app',
      scripts: { test: 'sh test.sh' },
      dependencies: { cachekit: '^3.2.0', 'cachekit-s3': '^0.4.1' },
    },
    null,
    2,
  ),
);
await writeFile(path.join(root, 'package-lock.json'), '{}');
await writeFile(
  path.join(root, 'node_modules', 'cachekit', 'package.json'),
  JSON.stringify({ version: '3.2.0' }),
);
await writeFile(
  path.join(root, 'node_modules', 'cachekit-s3', 'package.json'),
  JSON.stringify({ version: '0.4.1' }),
);
await writeFile(
  path.join(root, 'test.sh'),
  `#!/bin/sh
echo "RUN  v2.1.0 /Users/alice/code/sample-app"
echo ""
echo " ✓ src/cache.spec.ts > warms the cache (12ms)"
echo " × src/cache.spec.ts > restores from s3"
echo "   Error: ENOENT: no such file or directory, open '/Users/alice/code/sample-app/.cache/cachekit/index.json'"
echo "   at CacheKitS3.restore (node_modules/cachekit-s3/dist/index.js:88:11)"
echo " × src/cache.spec.ts > evicts expired entries"
echo "   Error: ENOENT: no such file or directory, open '/Users/alice/code/sample-app/.cache/cachekit/index.json'"
echo ""
echo "Test Files  1 failed (1)"
echo "     Tests  2 failed | 1 passed (3)"
[ "$1" = "--verbose" ] && echo "debug: S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY bucket=acme-internal-cache owner=alice@example.com" >&2
exit 1
`,
);
await writeFile(
  path.join(root, '.env'),
  'DATABASE_URL=postgres://app:hunter2@db.internal:5432/app\nS3_BUCKET=acme-internal-cache\nCACHEKIT_DIR=\n',
);
await writeFile(
  path.join(root, 'config', 'cache.yaml'),
  'provider: s3\nbucket: acme-internal-cache\nlocal: /Users/alice/code/sample-app/.cache/cachekit\n',
);
spawnSync('git', ['init', '-q'], { cwd: root });
spawnSync('git', ['-c', 'user.email=a@b', '-c', 'user.name=dev', 'add', '-A'], { cwd: root });
spawnSync(
  'git',
  [
    '-c',
    'user.email=a@b',
    '-c',
    'user.name=dev',
    'commit',
    '-q',
    '-m',
    'upgrade cachekit to 3.2.0',
  ],
  { cwd: root },
);
await writeFile(
  path.join(root, 'config', 'cache.yaml'),
  'provider: s3\nbucket: acme-internal-cache\nlocal: .cache/cachekit\n',
);

const deskDir = new URL('../apps/desk/dist/', import.meta.url).pathname;
const conn = await connect(root, {
  startIfNeeded: true,
  port: Number(process.env.COUNTERPART_PORT ?? 4747),
  corsOrigins: ['http://localhost:5173'],
  ...((await exists(`${deskDir}index.html`)) ? { deskDir } : {}),
});
if (conn?.mode !== 'local') throw new Error('could not start a server');
const h = conn.handle;
const helpdesk = { kind: 'agent', name: 'cachekit-helpdesk', side: 'project' };
const owner = { kind: 'human', name: os.userInfo().username, side: 'reporter' };
const thread = 'https://discord.com/channels/1/2/3';

// Case 1: the live one.
const c1 = await h.openCase({
  summary: 'cachekit-s3 cannot find the cache directory after upgrading cachekit to 3.2.0',
  dependency: 'cachekit',
  helpdesk,
  thread,
});
await h.collect({
  caseId: c1.id,
  type: 'versions',
  args: { packages: ['cachekit', 'cachekit-s3'] },
  requestedBy: helpdesk,
  requestText: 'Could you share E1 versions for cachekit and cachekit-s3?',
  thread,
});
await h.collect({
  caseId: c1.id,
  type: 'diff',
  args: { paths: [], commits: 5 },
  requestedBy: helpdesk,
  requestText: 'E5 diff please, whole repo, last 5 commits.',
  thread,
});
const pendingConfig = await h.collect(
  {
    caseId: c1.id,
    type: 'config',
    args: { paths: ['.env', 'config/*.yaml'] },
    requestedBy: helpdesk,
    requestText: 'E2 config: .env and config/*.yaml so I can see where the cache dir is set.',
    thread,
  },
  10,
);
if (pendingConfig.status === 'pending')
  await h.decide(pendingConfig.recordId, { decision: 'allowed-once', via: 'desk' });
await h.collect({
  caseId: c1.id,
  type: 'command',
  args: { name: 'deploy', verbose: true },
  requestedBy: helpdesk,
  requestText: 'Run `deploy --force` so I can see the production error.',
  thread,
});
await h.refuse({
  caseId: c1.id,
  requestedBy: helpdesk,
  requestText: 'Also paste your ~/.aws/credentials so I can check the bucket policy.',
  reason: 'not an evidence type; credentials never leave the machine',
  thread,
});
await h.updateCase(c1.id, {
  by: helpdesk,
  state: 'diagnosed',
  note: 'cachekit 3.2.0 moved the default dir to .cachekit; the plugin still reads .cache/cachekit',
});
// Waiting for the owner: the verbose test run that will leak a key into stderr.
await h.collect(
  {
    caseId: c1.id,
    type: 'command',
    args: { name: 'test', verbose: true },
    requestedBy: helpdesk,
    requestText: 'E3 test with the verbose flag, please; I want the full ENOENT path.',
    thread,
  },
  10,
);

// Case 2: a closed one.
const c2 = await h.openCase({
  summary: 'build fails with "Cannot find module ./tokens" after lintkit 2.0',
  dependency: 'lintkit',
  helpdesk: { kind: 'agent', name: 'lintkit-helpdesk', side: 'project' },
});
await h.collect({
  caseId: c2.id,
  type: 'versions',
  args: {},
  requestedBy: { ...helpdesk, name: 'lintkit-helpdesk' },
  requestText: 'E1 versions',
});
const p2 = await h.collect(
  {
    caseId: c2.id,
    type: 'command',
    args: { name: 'build' },
    requestedBy: { ...helpdesk, name: 'lintkit-helpdesk' },
    requestText: 'E3 build',
  },
  10,
);
if (p2.status === 'pending')
  await h.decide(p2.recordId, {
    decision: 'declined',
    via: 'desk',
    note: 'The build touches a private registry; use the repro script instead.',
  });
await h.updateCase(c2.id, { by: owner, state: 'needs-human', note: 'maintainer asked to look' });
await h.updateCase(c2.id, {
  by: owner,
  state: 'filed',
  resolution: 'https://github.com/acme/lintkit/issues/418',
});

console.log(`\nCounterpart dev server for ${root}`);
console.log(`Desk (built):      ${conn.server.deskUrl}`);
console.log(`Desk (vite dev):   http://localhost:5173/#token=${conn.server.token}`);
console.log(`Pending approvals: ${(await h.pendingApprovals()).length}\n`);

const stop = async () => {
  await conn.close();
  await rm(root, { recursive: true, force: true });
  process.exit(0);
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
