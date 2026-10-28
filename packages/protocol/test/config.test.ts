import { describe, expect, it } from 'vitest';
import { RunnerConfigSchema } from '../src/config.js';
import { evidenceTypeFromCode } from '../src/evidence.js';
import { ID_PATTERN, newId } from '../src/ids.js';

describe('runner config', () => {
  it('applies defaults', () => {
    const c = RunnerConfigSchema.parse({
      version: 1,
      project: { name: 'x' },
      menu: [{ name: 'test', description: 'tests', run: ['npm', 'test'] }],
    });
    expect(c.limits.maxLines).toBe(200);
    expect(c.redaction.keepRaw).toBe(true);
    expect(c.menu[0]?.cwd).toBe('.');
    expect(c.configPaths).toEqual([]);
  });

  it('rejects menu names that could smuggle shell syntax', () => {
    const r = RunnerConfigSchema.safeParse({
      version: 1,
      project: { name: 'x' },
      menu: [{ name: 'test; rm', description: 'bad', run: ['x'] }],
    });
    expect(r.success).toBe(false);
  });
});

describe('ids and codes', () => {
  it('produces prefixed ids', () => {
    expect(newId('case')).toMatch(ID_PATTERN);
    expect(new Set(Array.from({ length: 50 }, () => newId('rec'))).size).toBe(50);
  });
  it('maps E-codes to types', () => {
    expect(evidenceTypeFromCode('e4')).toBe('repro');
    expect(evidenceTypeFromCode('E9')).toBeUndefined();
  });
});
