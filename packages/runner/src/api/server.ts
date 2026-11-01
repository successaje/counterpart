import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { EVIDENCE_TYPES, PrincipalSchema } from '@counterpart/protocol';
import { type ServerType, serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { exists } from '../config/paths.js';
import { RunnerError } from '../handle.js';
import type { Runner } from '../runner.js';

export const TOKEN_HEADER = 'x-counterpart-token';

const principal = PrincipalSchema;

const OpenCaseBody = z.object({
  summary: z.string().min(1).max(300),
  dependency: z.string().optional(),
  helpdesk: principal.optional(),
  thread: z.string().url().optional(),
});

const UpdateCaseBody = z.object({
  by: principal,
  state: z.string().optional(),
  note: z.string().optional(),
  resolution: z.string().optional(),
  helpdesk: principal.optional(),
  thread: z.string().url().optional(),
  dependency: z.string().optional(),
  summary: z.string().optional(),
});

const CollectBody = z.object({
  input: z.object({
    caseId: z.string(),
    type: z.string(),
    args: z.unknown(),
    requestedBy: principal,
    requestText: z.string().min(1),
    thread: z.string().url().optional(),
  }),
  waitMs: z.number().int().min(0).max(600_000).optional(),
});

const RefuseBody = z.object({
  caseId: z.string(),
  requestedBy: principal,
  requestText: z.string().min(1),
  reason: z.string().min(1),
  thread: z.string().url().optional(),
});

const DecisionBody = z.object({
  decision: z.enum(['allowed-once', 'allowed-for-case', 'declined']),
  via: z.enum(['desk', 'cli']),
  note: z.string().max(500).optional(),
});

const WaitBody = z.object({ waitMs: z.number().int().min(0).max(600_000).optional() });

/** Zod leaves optional keys as `undefined`; the runner's types omit them instead. */
type Stripped<T> = { [K in keyof T as undefined extends T[K] ? never : K]: T[K] } & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};

function strip<T extends Record<string, unknown>>(o: T): Stripped<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Stripped<T>;
}

export interface ServerOptions {
  runner: Runner;
  /** Directory with the built Desk. Omit to serve the API only. */
  deskDir?: string;
  /** Shared secret. Generated when omitted. */
  token?: string;
  /** Extra origins allowed for the Desk's dev server. */
  corsOrigins?: string[];
}

export function createApp(opts: ServerOptions) {
  const token = opts.token ?? randomBytes(24).toString('base64url');
  const { runner } = opts;
  const app = new Hono();

  app.onError((err, c) => {
    if (err instanceof RunnerError)
      return c.json({ error: err.code, message: err.message }, err.httpStatus as 400);
    if (err instanceof z.ZodError) {
      return c.json(
        {
          error: 'invalid',
          message: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        },
        400,
      );
    }
    console.error(err);
    return c.json({ error: 'internal', message: err.message }, 500);
  });

  const api = new Hono();
  api.use(
    '*',
    cors({
      origin: (origin) => (opts.corsOrigins?.includes(origin) ? origin : null),
      allowHeaders: ['content-type', TOKEN_HEADER],
    }),
  );
  api.get('/health', async (c) => {
    const info = await runner.info();
    return c.json({
      ok: true,
      version: info.version,
      project: info.project.name,
      projectRoot: info.projectRoot,
    });
  });
  api.use('*', async (c, next) => {
    if (c.req.path === '/api/health') return next();
    const given = c.req.header(TOKEN_HEADER) ?? c.req.query('token');
    if (given !== token) throw new RunnerError('unauthorized', 'missing or wrong Desk token.');
    return next();
  });

  api.get('/info', async (c) => c.json(await runner.info()));

  api.get('/cases', async (c) => {
    const open = c.req.query('open');
    return c.json(await runner.listCases(open === undefined ? {} : { open: open === 'true' }));
  });
  api.post('/cases', async (c) =>
    c.json(await runner.openCase(strip(OpenCaseBody.parse(await c.req.json()))), 201),
  );
  api.get('/cases/:id', async (c) => c.json(await runner.getCase(c.req.param('id'))));
  api.patch('/cases/:id', async (c) => {
    const body = strip(UpdateCaseBody.parse(await c.req.json()));
    // biome-ignore lint/suspicious/noExplicitAny: state is validated inside the runner against CASE_STATES.
    return c.json(await runner.updateCase(c.req.param('id'), body as any));
  });
  api.post('/cases/:id/trust/:type/revoke', async (c) => {
    const type = c.req.param('type') as (typeof EVIDENCE_TYPES)[number];
    if (!EVIDENCE_TYPES.includes(type))
      throw new RunnerError('invalid', `unknown evidence type ${type}`);
    return c.json(await runner.revokeTrust(c.req.param('id'), type));
  });

  api.get('/records', async (c) => c.json(await runner.listRecords(c.req.query('caseId'))));
  api.get('/records/:id', async (c) => c.json(await runner.getRecord(c.req.param('id'))));
  api.post('/records/:id/await', async (c) => {
    const { waitMs } = WaitBody.parse((await c.req.json().catch(() => ({}))) ?? {});
    return c.json(await runner.awaitRecord(c.req.param('id'), waitMs));
  });

  api.post('/collect', async (c) => {
    const { input, waitMs } = CollectBody.parse(await c.req.json());
    return c.json(await runner.collect({ ...strip(input), args: input.args }, waitMs));
  });
  api.post('/refuse', async (c) =>
    c.json(await runner.refuse(strip(RefuseBody.parse(await c.req.json()))), 201),
  );

  api.get('/approvals', async (c) => c.json(await runner.pendingApprovals()));
  api.post('/approvals/:recordId', async (c) => {
    const body = strip(DecisionBody.parse(await c.req.json()));
    return c.json(await runner.decide(c.req.param('recordId'), body));
  });

  api.get('/events', (c) =>
    streamSSE(c, async (stream) => {
      let id = 0;
      const off = runner.subscribe((event) => {
        void stream.writeSSE({ event: event.type, data: JSON.stringify(event), id: String(id++) });
      });
      stream.onAbort(off);
      await stream.writeSSE({
        event: 'hello',
        data: JSON.stringify({ ok: true }),
        id: String(id++),
      });
      // Keep the connection open until the client goes away.
      while (!stream.aborted) {
        await stream.sleep(15_000);
        if (!stream.aborted) await stream.writeSSE({ event: 'ping', data: '{}' });
      }
    }),
  );

  app.route('/api', api);

  if (opts.deskDir) {
    const deskDir = opts.deskDir;
    const root = path.relative(process.cwd(), deskDir) || '.';
    app.use('/*', serveStatic({ root }));
    app.get('*', async (c) => {
      const index = path.join(deskDir, 'index.html');
      if (!(await exists(index)))
        return c.text('Desk is not built. Run `pnpm --filter @counterpart/desk build`.', 404);
      return c.html(await readFile(index, 'utf8'));
    });
  }

  return { app, token };
}

export interface RunningServer {
  server: ServerType;
  port: number;
  token: string;
  url: string;
  deskUrl: string;
  close(): Promise<void>;
}

export function listen(
  opts: ServerOptions & { port: number; hostname?: string },
): Promise<RunningServer> {
  const { app, token } = createApp(opts);
  const hostname = opts.hostname ?? '127.0.0.1';
  return new Promise((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port: opts.port, hostname }, (info: AddressInfo) => {
      const url = `http://${hostname}:${info.port}`;
      resolve({
        server,
        port: info.port,
        token,
        url,
        deskUrl: `${url}/#token=${token}`,
        close: () =>
          new Promise<void>((done) => {
            // close() alone waits for open SSE streams, which never end on
            // their own; drop every connection so the process can exit.
            server.close(() => done());
            if ('closeAllConnections' in server) server.closeAllConnections();
          }),
      });
    });
    server.once('error', reject);
  });
}
