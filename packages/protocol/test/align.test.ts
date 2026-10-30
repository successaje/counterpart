import { describe, expect, it } from 'vitest';
import { alignRedaction, redactedFields } from '../src/align.js';
import type { Payload } from '../src/record.js';
import { compileRules, redactText, token } from '../src/redaction.js';

describe('alignRedaction', () => {
  it('recovers the removed spans from a real redaction', () => {
    const raw = [
      'RUN  /Users/alice/code/sample-app',
      `debug: S3_SECRET=${'wJalrXUtnFEMI'}${'K7MDENGbPxRfiCYEXAMPLEKEY'} owner=alice@example.com`,
    ].join('\n');
    const { text } = redactText(raw, compileRules());
    const segments = alignRedaction(raw, text);
    expect(segments).not.toBeNull();
    const removed = segments?.filter((s) => s.kind === 'removed') ?? [];
    expect(removed.map((s) => s.kind === 'removed' && s.category)).toEqual([
      'user',
      'secret',
      'email',
    ]);
    expect(removed[0]).toMatchObject({ text: 'alice' });
    expect(removed[2]).toMatchObject({ text: 'alice@example.com' });
    // Kept text plus tokens rebuilds the release exactly.
    expect(segments?.map((s) => (s.kind === 'kept' ? s.text : s.token)).join('')).toBe(text);
  });

  it('treats adjacent tokens as one removed span', () => {
    const raw = 'a=XXXXYYYY b';
    const released = `a=${token('secret')}${token('custom')} b`;
    const segments = alignRedaction(raw, released);
    expect(segments).toEqual([
      { kind: 'kept', text: 'a=' },
      {
        kind: 'removed',
        text: 'XXXXYYYY',
        token: `${token('secret')}${token('custom')}`,
        category: 'secret',
      },
      { kind: 'kept', text: ' b' },
    ]);
  });

  it('handles a token at the very start and the very end', () => {
    const released = `${token('path')}/x and ${token('email')}`;
    const segments = alignRedaction('/Users/bob/x and bob@x.io', released);
    expect(segments?.[0]).toMatchObject({ kind: 'removed', text: '/Users/bob' });
    expect(segments?.at(-1)).toMatchObject({ kind: 'removed', text: 'bob@x.io' });
  });

  it('refuses to guess when the texts do not line up', () => {
    expect(alignRedaction('hello world', `hi ${token('secret')}`)).toBeNull();
    expect(alignRedaction('same', 'different')).toBeNull();
    expect(alignRedaction('same', 'same')).toEqual([{ kind: 'kept', text: 'same' }]);
  });
});

describe('redactedFields', () => {
  it('lists only the strings that changed, with readable labels', () => {
    const raw: Payload = {
      type: 'config',
      files: [
        { path: '.env', content: 'A=1\nB=2', bytes: 7, truncated: false },
        { path: 'config/cache.yaml', content: 'local: /tmp/x', bytes: 13, truncated: false },
      ],
    };
    const released: Payload = {
      type: 'config',
      files: [
        {
          path: '.env',
          content: `A=${token('env')}\nB=${token('env')}`,
          bytes: 7,
          truncated: false,
        },
        { path: 'config/cache.yaml', content: 'local: /tmp/x', bytes: 13, truncated: false },
      ],
    };
    expect(redactedFields(raw, released)).toEqual([
      {
        path: 'files.0.content',
        label: '.env',
        raw: 'A=1\nB=2',
        released: `A=${token('env')}\nB=${token('env')}`,
      },
    ]);
  });

  it('labels command output and nested verify output', () => {
    const out = (s: string) => ({
      stdout: s,
      stderr: '',
      exitCode: 0,
      durationMs: 1,
      truncated: false,
      timedOut: false,
    });
    const raw: Payload = {
      type: 'apply-fix',
      description: 'pin dir',
      patch: '--- a\n+++ b',
      applied: true,
      applyOutput: 'ok',
      verify: { type: 'command', name: 'test', argv: ['sh'], cwd: '.', output: out('alice@x.io') },
    };
    const released: Payload = {
      ...raw,
      verify: { ...raw.verify, output: out(token('email')) },
    } as Payload;
    expect(redactedFields(raw, released).map((f) => f.label)).toEqual(['verify · stdout']);
  });
});
