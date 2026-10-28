import { describe, expect, it } from 'vitest';
import { type RunnerConfig, RunnerConfigSchema } from '../src/config.js';
import {
  approvalPolicyFor,
  globToRegExp,
  isPathAllowed,
  normalisePath,
  validateRequest,
} from '../src/validate.js';

const config: RunnerConfig = RunnerConfigSchema.parse({
  version: 1,
  project: { name: 'sample-app' },
  menu: [
    {
      name: 'test',
      description: 'run the test suite',
      run: ['pnpm', 'test'],
      verbose: ['--reporter=verbose'],
    },
    { name: 'build', description: 'build', run: ['pnpm', 'build'] },
  ],
  configPaths: ['config/*.yaml', '.env', 'src/cache/**'],
  approvals: { config: 'automatic' },
});

describe('validateRequest', () => {
  it('accepts a menu command', () => {
    const r = validateRequest(config, 'command', { name: 'test' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.menuEntry?.name).toBe('test');
  });

  it('refuses an unknown command with the menu in the reason', () => {
    const r = validateRequest(config, 'command', { name: 'rm -rf /' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('Available: test, build');
  });

  it('refuses an unknown evidence type', () => {
    const r = validateRequest(config, 'shell', {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not an evidence type/);
  });

  it('refuses config paths outside the allowlist, including traversal', () => {
    expect(validateRequest(config, 'config', { paths: ['config/cache.yaml'] }).ok).toBe(true);
    expect(validateRequest(config, 'config', { paths: ['src/cache/deep/file.ts'] }).ok).toBe(true);
    const r = validateRequest(config, 'config', { paths: ['../other/.env', 'package.json'] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('"../other/.env", "package.json" are not');
  });

  it('requires a unified diff and a menu entry for apply-fix', () => {
    const good = validateRequest(config, 'apply-fix', {
      patch: 'diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n',
      verifyWith: 'test',
      description: 'rename',
    });
    expect(good.ok).toBe(true);
    const bad = validateRequest(config, 'apply-fix', {
      patch: 'please edit x',
      verifyWith: 'test',
      description: 'x',
    });
    expect(bad.ok).toBe(false);
  });

  it('fills defaults for optional args', () => {
    const r = validateRequest(config, 'diff', {});
    expect(r.ok).toBe(true);
    if (r.ok && r.args.type === 'diff') expect(r.args.args.commits).toBe(5);
  });

  it('resolves approval policy from config, then defaults', () => {
    expect(approvalPolicyFor(config, 'config')).toBe('automatic');
    expect(approvalPolicyFor(config, 'command')).toBe('ask');
    expect(approvalPolicyFor(config, 'versions')).toBe('automatic');
  });
});

describe('paths', () => {
  it('normalises and detects escapes', () => {
    expect(normalisePath('./config//cache.yaml')).toBe('config/cache.yaml');
    expect(normalisePath('config/../.env')).toBe('.env');
    expect(normalisePath('../x')).toBe('..');
  });

  it('matches globs across segments only with **', () => {
    expect(globToRegExp('config/*.yaml').test('config/a.yaml')).toBe(true);
    expect(globToRegExp('config/*.yaml').test('config/sub/a.yaml')).toBe(false);
    expect(globToRegExp('src/**').test('src/a/b/c.ts')).toBe(true);
    expect(isPathAllowed('.env', ['.env'])).toBe(true);
    expect(isPathAllowed('.env.local', ['.env'])).toBe(false);
  });
});
