import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp, TOKEN_HEADER } from '../src/api/server.js';
import { connect } from '../src/connect.js';
import { Runner } from '../src/runner.js';
import { type Fixture, helpdesk, makeProject } from './helpers.js';

let fx: Fixture;
let runner: Runner;

beforeEach(async () => {
  fx = await makeProject();
  runner = await Runner.open(fx.root);
});
afterEach(async () => {
  runner.close();
  await fx.cleanup();
});

describe('local API', () => {
  it('requires the token everywhere except health', async () => {
    const { app, token } = createApp({ runner });
    expect((await app.request('/api/health')).status).toBe(200);
    expect((await app.request('/api/info')).status).toBe(401);
    const ok = await app.request('/api/info', { headers: { [TOKEN_HEADER]: token } });
    expect(ok.status).toBe(200);
    const info = (await ok.json()) as { project: { name: string }; menu: unknown[] };
    expect(info.project.name).toBe('sample-app');
    expect(info.menu).toHaveLength(3);
  });

  it('runs the collect flow over HTTP', async () => {
    const { app, token } = createApp({ runner });
    const headers = { [TOKEN_HEADER]: token, 'content-type': 'application/json' };
    const created = await app.request('/api/cases', {
      method: 'POST',
      headers,
      body: JSON.stringify({ summary: 'broken after upgrade' }),
    });
    expect(created.status).toBe(201);
    const c = (await created.json()) as { id: string };

    const collected = await app.request('/api/collect', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input: {
          caseId: c.id,
          type: 'command',
          args: { name: 'greet' },
          requestedBy: helpdesk,
          requestText: 'run greet',
        },
        waitMs: 10,
      }),
    });
    const pending = (await collected.json()) as { status: string; recordId: string };
    expect(pending.status).toBe('pending');

    const approvals = await app.request('/api/approvals', { headers });
    expect(((await approvals.json()) as unknown[]).length).toBe(1);

    const decided = await app.request(`/api/approvals/${pending.recordId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ decision: 'allowed-once', via: 'desk' }),
    });
    const result = (await decided.json()) as {
      status: string;
      release: { released: { output: { stdout: string } } };
    };
    expect(result.status).toBe('released');
    expect(result.release.released.output.stdout.trim()).toBe('hello world');

    const bad = await app.request('/api/cases/nope', { headers });
    expect(bad.status).toBe(404);
    const invalid = await app.request('/api/cases', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    expect(invalid.status).toBe(400);
  });
});

describe('connect', () => {
  it('starts one server per project and lets later processes join it', async () => {
    runner.close();
    const first = await connect(fx.root, { startIfNeeded: true, port: 0 });
    expect(first?.mode).toBe('local');
    if (first?.mode !== 'local') throw new Error('unexpected');
    try {
      const second = await connect(fx.root, { startIfNeeded: false });
      expect(second?.mode).toBe('remote');
      if (second?.mode !== 'remote') throw new Error('unexpected');
      const info = await second.handle.info();
      expect(info.project.name).toBe('sample-app');
      const c = await second.handle.openCase({ summary: 'via remote' });
      expect((await first.handle.getCase(c.id)).summary).toBe('via remote');

      const seen: string[] = [];
      const off = second.handle.subscribe((e) => seen.push(e.type));
      await new Promise((r) => setTimeout(r, 150));
      await second.handle.updateCase(c.id, { by: helpdesk, note: 'ping' });
      await new Promise((r) => setTimeout(r, 300));
      off();
      expect(seen).toContain('case.updated');
    } finally {
      await first.close();
    }
    expect(await connect(fx.root, { startIfNeeded: false })).toBeNull();
  });
});
