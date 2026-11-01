#!/usr/bin/env node
/**
 * Sets the same version on every package, public or not, so a release is
 * one number. `pnpm version:set 0.2.0`, then commit, tag v0.2.0, push.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'tinyglobby';

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error('usage: pnpm version:set <semver>');
  process.exit(2);
}
const root = new URL('..', import.meta.url).pathname;
const manifests = await glob(['packages/*/package.json', 'apps/*/package.json'], { cwd: root });
for (const rel of manifests.sort()) {
  const file = path.join(root, rel);
  const pkg = JSON.parse(await readFile(file, 'utf8'));
  pkg.version = version;
  await writeFile(file, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`${pkg.name} → ${version}`);
}
