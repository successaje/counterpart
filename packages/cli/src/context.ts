import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import type { Principal } from '@counterpart/protocol';
import {
  type Connection,
  connect,
  exists,
  findProjectRoot,
  RunnerError,
} from '@counterpart/runner';
import { fail, ui } from './ui.js';

export const DESK_DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

/** The person at the keyboard, as recorded in the ledger. */
export function ownerPrincipal(): Principal {
  let name = 'owner';
  try {
    name = os.userInfo().username;
  } catch {
    // fall through
  }
  return { kind: 'human', name, side: 'reporter' };
}

/** The reporter's agent, as it names itself in the room. */
export function agentPrincipal(): Principal {
  return {
    kind: 'agent',
    name: process.env.COUNTERPART_AGENT_NAME ?? 'dev-agent',
    side: 'reporter',
  };
}

export async function requireProjectRoot(cwd = process.cwd()): Promise<string> {
  const root = await findProjectRoot(cwd);
  if (!root) {
    fail(
      `no .counterpart/runner.yaml found from ${cwd} upwards. Run ${ui.code('counterpart init')} in your project.`,
    );
  }
  return root;
}

/** The built Desk, when the package is installed next to the CLI. */
export async function resolveDeskDir(): Promise<string | undefined> {
  const override = process.env.COUNTERPART_DESK_DIR;
  if (override) return (await exists(path.join(override, 'index.html'))) ? override : undefined;
  try {
    const require = createRequire(import.meta.url);
    const pkg = require.resolve('@counterpart/desk/package.json');
    const dist = path.join(path.dirname(pkg), 'dist');
    return (await exists(path.join(dist, 'index.html'))) ? dist : undefined;
  } catch {
    return undefined;
  }
}

export async function openConnection(
  root: string,
  start: boolean,
  port?: number,
): Promise<Connection> {
  const deskDir = await resolveDeskDir();
  try {
    const conn = await connect(root, {
      startIfNeeded: start,
      ...(port !== undefined ? { port } : {}),
      ...(deskDir ? { deskDir } : {}),
      corsOrigins: DESK_DEV_ORIGINS,
    });
    if (!conn) {
      fail(
        `no Counterpart server is running for this project. Start one with ${ui.code('counterpart desk')}.`,
      );
    }
    return conn;
  } catch (err) {
    if (err instanceof RunnerError) fail(err.message);
    throw err;
  }
}

export function openInBrowser(url: string): void {
  if (process.env.COUNTERPART_NO_OPEN) return;
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  import('node:child_process').then(({ spawn }) => {
    try {
      spawn(cmd, [url], {
        stdio: 'ignore',
        detached: true,
        shell: process.platform === 'win32',
      }).unref();
    } catch {
      // the URL is printed anyway
    }
  });
}
