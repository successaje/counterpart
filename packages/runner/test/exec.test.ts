import { describe, expect, it } from 'vitest';
import { execArgv, SpawnError, stripAnsi, truncateLines } from '../src/collect/exec.js';

const limits = { cwd: process.cwd(), timeoutMs: 5000, maxLines: 10, maxBytes: 1024 };

describe('execArgv', () => {
  it('captures output and exit code without a shell', async () => {
    const out = await execArgv(['sh', '-c', 'echo out; echo err 1>&2; exit 3'], limits);
    expect(out.stdout.trim()).toBe('out');
    expect(out.stderr.trim()).toBe('err');
    expect(out.exitCode).toBe(3);
    expect(out.timedOut).toBe(false);
  });

  it('kills on timeout and says so', async () => {
    const out = await execArgv(['sleep', '5'], { ...limits, timeoutMs: 200 });
    expect(out.timedOut).toBe(true);
    expect(out.exitCode).toBeNull();
  });

  it('truncates by bytes and by lines', async () => {
    const out = await execArgv(
      ['sh', '-c', 'i=0; while [ $i -lt 400 ]; do echo line$i; i=$((i+1)); done'],
      limits,
    );
    expect(out.truncated).toBe(true);
    expect(out.stdout.split('\n').length).toBeLessThanOrEqual(11);
    expect(out.stdout).toContain('lines omitted by the runner');
  });

  it('throws SpawnError for a program that does not exist', async () => {
    await expect(execArgv(['definitely-not-a-program-xyz'], limits)).rejects.toBeInstanceOf(
      SpawnError,
    );
  });

  it('does not expand shell syntax in arguments', async () => {
    const out = await execArgv(['echo', '$HOME', ';', 'echo', 'pwned'], limits);
    expect(out.stdout.trim()).toBe('$HOME ; echo pwned');
  });
});

describe('helpers', () => {
  it('strips ANSI colour codes', () => {
    expect(stripAnsi('\u001b[32mok\u001b[0m')).toBe('ok');
  });
  it('keeps head and tail when truncating lines', () => {
    const text = Array.from({ length: 100 }, (_, i) => `l${i}`).join('\n');
    const r = truncateLines(text, 8);
    expect(r.truncated).toBe(true);
    const lines = r.text.split('\n');
    expect(lines[0]).toBe('l0');
    expect(lines[1]).toBe('l1');
    expect(lines.at(-1)).toBe('l99');
    expect(lines).toHaveLength(9);
  });
});
