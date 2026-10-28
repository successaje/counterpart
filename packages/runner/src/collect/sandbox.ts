import { execArgv } from './exec.js';

/**
 * Network-denying wrappers for E4 reproductions. The runner refuses E4 when
 * none is available rather than running the script with the network open.
 */
export interface SandboxAdapter {
  readonly name: string;
  wrap(argv: readonly string[]): string[];
}

const MACOS_PROFILE = '(version 1)(allow default)(deny network*)';

const sandboxExec: SandboxAdapter = {
  name: 'sandbox-exec (macOS, network denied)',
  wrap: (argv) => ['/usr/bin/sandbox-exec', '-p', MACOS_PROFILE, ...argv],
};

const unshare: SandboxAdapter = {
  name: 'unshare -rn (Linux user namespace, no network)',
  wrap: (argv) => ['unshare', '-rn', '--', ...argv],
};

export interface SandboxProbe {
  adapter: SandboxAdapter | null;
  reason?: string;
}

async function works(adapter: SandboxAdapter, probe: readonly string[]): Promise<boolean> {
  try {
    const out = await execArgv(adapter.wrap(probe), {
      cwd: process.cwd(),
      timeoutMs: 5000,
      maxLines: 10,
      maxBytes: 4096,
    });
    return out.exitCode === 0;
  } catch {
    return false;
  }
}

let cached: Promise<SandboxProbe> | null = null;

export function detectSandbox(): Promise<SandboxProbe> {
  if (cached) return cached;
  cached = (async () => {
    if (process.platform === 'darwin') {
      if (await works(sandboxExec, ['/usr/bin/true'])) return { adapter: sandboxExec };
      return { adapter: null, reason: '/usr/bin/sandbox-exec is missing or refused to run.' };
    }
    if (process.platform === 'linux') {
      if (await works(unshare, ['true'])) return { adapter: unshare };
      return {
        adapter: null,
        reason: '`unshare -rn` is unavailable; unprivileged user namespaces may be disabled.',
      };
    }
    return { adapter: null, reason: `no network sandbox is known for ${process.platform}.` };
  })();
  return cached;
}

/** Test seam. */
export function resetSandboxCache(): void {
  cached = null;
}
