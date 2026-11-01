#!/usr/bin/env node
/**
 * Packs every public package into ./release as the tarballs npm would
 * publish, so a pull request proves the packages are publishable before a
 * tag ever exists. `pnpm release:pack`.
 *
 * The CLI depends on the Desk's built files, the runner and the protocol;
 * all four are public. The design system is consumed as source by the apps
 * and stays private.
 */
import { spawnSync } from 'node:child_process';
import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = path.join(root, 'release');
const PUBLIC = ['packages/protocol', 'packages/runner', 'apps/desk', 'packages/cli'];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const dir of PUBLIC) {
  const pkg = JSON.parse(await readFile(path.join(root, dir, 'package.json'), 'utf8'));
  if (pkg.private) throw new Error(`${pkg.name} is private and cannot be published`);
  const r = spawnSync('pnpm', ['pack', '--pack-destination', out], {
    cwd: path.join(root, dir),
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const files = (await readdir(out)).filter((f) => f.endsWith('.tgz')).sort();
console.log(`\npacked ${files.length} packages into release/:\n  ${files.join('\n  ')}`);
if (files.length !== PUBLIC.length) {
  console.error(`expected ${PUBLIC.length} tarballs`);
  process.exit(1);
}
