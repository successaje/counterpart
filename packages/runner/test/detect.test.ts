import { afterEach, describe, expect, it } from 'vitest';
import { detectProject, proposeConfig, slugify } from '../src/config/detect.js';
import { type Fixture, makeProject } from './helpers.js';

let fx: Fixture;
afterEach(async () => fx?.cleanup());

describe('detectProject', () => {
  it('proposes a menu from safe package scripts and known config paths', async () => {
    fx = await makeProject();
    const d = await detectProject(fx.root);
    expect(d.packageManager).toBe('npm');
    const names = d.menu.map((m) => m.name);
    expect(names).toEqual(['test', 'build']);
    const test = d.menu.find((m) => m.name === 'test');
    expect(test?.run).toEqual(['npm', 'run', 'test', '--']);
    expect(test?.verbose).toEqual(['--reporter=verbose']);
    expect(d.configPaths).toContain('.env');
    expect(d.configPaths).toContain('config/**');
    expect(d.configPaths).not.toContain('pyproject.toml');
    expect(d.configPaths).not.toContain('vite.config.*');
    expect(d.dependencies).toContain('cachekit');
    const config = proposeConfig('@acme/Sample App', d);
    expect(config.project.name).toBe('sample-app');
    expect(config.version).toBe(1);
  });
});

describe('slugify', () => {
  it('drops scopes and odd characters', () => {
    expect(slugify('@scope/My_App 2')).toBe('my-app-2');
    expect(slugify('123')).toBe('project');
  });
});
