import { chmod } from 'node:fs/promises';
import { RemoteRunner } from './api/client.js';
import { listen, type RunningServer } from './api/server.js';
import { pathsFor } from './config/paths.js';
import type { RunnerHandle } from './handle.js';
import { Runner } from './runner.js';
import { readJson, removeFile, writeJsonAtomic } from './store/files.js';

export const DEFAULT_PORT = 4747;

export interface ServerRecord {
  port: number;
  token: string;
  pid: number;
  url: string;
  deskUrl: string;
  startedAt: string;
}

export type Connection =
  | { mode: 'remote'; handle: RemoteRunner; server: ServerRecord }
  | { mode: 'local'; handle: Runner; server: RunningServer; close(): Promise<void> };

export interface ConnectOptions {
  /** Start a server in this process when none is running. */
  startIfNeeded?: boolean;
  port?: number;
  deskDir?: string;
  corsOrigins?: string[];
}

/**
 * One server per project owns the ledger. Whoever starts first (the MCP
 * server under a coding agent, or `counterpart desk`) becomes it; later
 * processes connect over HTTP. The record file is readable by the owner only.
 */
export async function connect(root: string, opts: ConnectOptions = {}): Promise<Connection | null> {
  const paths = pathsFor(root);
  const existing = await readJson<ServerRecord>(paths.server);
  if (existing) {
    const remote = new RemoteRunner(existing.url, existing.token);
    const health = await remote.health();
    if (health?.ok && health.projectRoot === root)
      return { mode: 'remote', handle: remote, server: existing };
    await removeFile(paths.server);
  }
  if (!opts.startIfNeeded) return null;

  let deskUrl: string | null = null;
  const runner = await Runner.open(root, { deskUrl: () => deskUrl });
  const preferred = opts.port ?? Number(process.env.COUNTERPART_PORT ?? DEFAULT_PORT);
  const serverOpts = {
    runner,
    ...(opts.deskDir ? { deskDir: opts.deskDir } : {}),
    ...(opts.corsOrigins ? { corsOrigins: opts.corsOrigins } : {}),
  };
  let server: RunningServer;
  try {
    server = await listen({ ...serverOpts, port: preferred });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw err;
    server = await listen({ ...serverOpts, port: 0 });
  }
  deskUrl = opts.deskDir ? server.deskUrl : null;

  const record: ServerRecord = {
    port: server.port,
    token: server.token,
    pid: process.pid,
    url: server.url,
    deskUrl: server.deskUrl,
    startedAt: new Date().toISOString(),
  };
  await writeJsonAtomic(paths.server, record, 0o600);
  await chmod(paths.server, 0o600);

  const close = async () => {
    runner.close();
    await server.close();
    const current = await readJson<ServerRecord>(paths.server);
    if (current?.pid === process.pid) await removeFile(paths.server);
  };
  return { mode: 'local', handle: runner, server, close };
}

export function handleOf(conn: Connection): RunnerHandle {
  return conn.handle;
}
