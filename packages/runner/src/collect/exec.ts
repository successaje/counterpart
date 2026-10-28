import { spawn } from 'node:child_process';
import type { Output } from '@counterpart/protocol';

export interface ExecOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs: number;
  maxLines: number;
  maxBytes: number;
}

export class SpawnError extends Error {
  constructor(
    readonly argv: readonly string[],
    cause: Error,
  ) {
    super(`could not start \`${argv[0]}\`: ${cause.message}`);
    this.name = 'SpawnError';
  }
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences start with ESC.
const ANSI = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07/g;

export function stripAnsi(s: string): string {
  return s.replace(ANSI, '');
}

/**
 * Keeps the first quarter and the last three quarters of the allowed lines.
 * Failures in test output live at the end; the header at the start says what
 * ran. The middle is where the noise is.
 */
export function truncateLines(
  text: string,
  maxLines: number,
): { text: string; truncated: boolean } {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return { text, truncated: false };
  const head = Math.max(1, Math.floor(maxLines / 4));
  const tail = maxLines - head;
  const omitted = lines.length - head - tail;
  return {
    text: [
      ...lines.slice(0, head),
      `… ${omitted} lines omitted by the runner …`,
      ...lines.slice(-tail),
    ].join('\n'),
    truncated: true,
  };
}

/**
 * Runs an argv array with no shell. Captures stdout and stderr up to
 * `maxBytes` each, kills on timeout, strips colour codes and applies the line
 * limit. Never throws for a non-zero exit; throws `SpawnError` when the
 * program cannot start at all.
 */
export function execArgv(argv: readonly string[], opts: ExecOptions): Promise<Output> {
  const [cmd, ...args] = argv;
  if (!cmd) throw new Error('empty argv');
  const started = Date.now();

  return new Promise<Output>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    let bytesOut = 0;
    let bytesErr = 0;
    let truncated = false;
    let timedOut = false;

    const capture = (chunk: Buffer, which: 'out' | 'err') => {
      const bytes = which === 'out' ? bytesOut : bytesErr;
      const room = opts.maxBytes - bytes;
      if (room <= 0) {
        truncated = true;
        return;
      }
      const piece = chunk.subarray(0, room).toString('utf8');
      if (chunk.length > room) truncated = true;
      if (which === 'out') {
        stdout += piece;
        bytesOut += chunk.length;
      } else {
        stderr += piece;
        bytesErr += chunk.length;
      }
    };

    child.stdout.on('data', (c: Buffer) => capture(c, 'out'));
    child.stderr.on('data', (c: Buffer) => capture(c, 'err'));

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (child.exitCode === null) child.kill('SIGKILL');
      }, 3000).unref();
    }, opts.timeoutMs);

    child.once('error', (err) => {
      clearTimeout(timer);
      reject(new SpawnError(argv, err));
    });

    child.once('close', (code) => {
      clearTimeout(timer);
      const out = truncateLines(stripAnsi(stdout), opts.maxLines);
      const err = truncateLines(stripAnsi(stderr), opts.maxLines);
      resolve({
        stdout: out.text,
        stderr: err.text,
        exitCode: code,
        durationMs: Date.now() - started,
        truncated: truncated || out.truncated || err.truncated,
        timedOut,
      });
    });
  });
}
