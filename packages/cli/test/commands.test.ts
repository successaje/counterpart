import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Runner } from '@counterpart/runner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decide, listApprovals } from '../src/commands/approvals.js';
import { listCases, showCase } from '../src/commands/cases.js';
import { runInit } from '../src/commands/init.js';

const helpdesk = { kind: 'agent', name: 'cachekit-helpdesk', side: 'project' } as const;

let root: string;
let runner: Runner;
let out: string[];

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'counterpart-cli-json-'));
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'sample', scripts: { test: 'node -e "console.log(1)"' } }),
  );
  await writeFile(path.join(root, 'package-lock.json'), '{}');
  await mkdir(path.join(root, 'node_modules'), { recursive: true });
  await runInit({ cwd: root, log: () => undefined });
  runner = await Runner.open(root);
  out = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    out.push(args.map(String).join(' '));
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  runner.close();
  await rm(root, { recursive: true, force: true });
});

function lastJson(): unknown {
  return JSON.parse(out.at(-1) ?? 'null');
}

describe('--json output', () => {
  it('prints cases and a case as JSON that scripts can consume', async () => {
    const c = await runner.openCase({ summary: 'tests fail', dependency: 'cachekit', helpdesk });
    await listCases(runner, true, true);
    const cases = lastJson() as Array<{ id: string; state: string }>;
    expect(cases.map((x) => x.id)).toEqual([c.id]);
    expect(cases[0]?.state).toBe('reported');

    await showCase(runner, c.id, false, true);
    const shown = lastJson() as { case: { id: string }; records: unknown[] };
    expect(shown.case.id).toBe(c.id);
    expect(shown.records).toEqual([]);
  });

  it('prints pending approvals and the decision result as JSON, without raw evidence', async () => {
    const c = await runner.openCase({ summary: 'tests fail', helpdesk });
    const pending = await runner.collect(
      {
        caseId: c.id,
        type: 'command',
        args: { name: 'test' },
        requestedBy: helpdesk,
        requestText: 'E3 test',
      },
      0,
    );
    expect(pending.status).toBe('pending');
    if (pending.status !== 'pending') return;

    await listApprovals(runner, true);
    const list = lastJson() as Array<{ id: string; status: string }>;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: pending.recordId, status: 'pending' });

    const result = await decide(runner, pending.recordId, 'allowed-once', undefined, true);
    expect(result.status).toBe('released');
    const printed = lastJson() as { status: string; release: Record<string, unknown> };
    expect(printed.status).toBe('released');
    expect(printed.release.released).toBeDefined();
    expect('raw' in printed.release).toBe(false);
  });
});
