import { describe, expect, it } from 'vitest';
import {
  compileRules,
  redactEnvContent,
  redactText,
  redactValue,
  token,
} from '../src/redaction.js';

const rules = compileRules();

describe('redactText', () => {
  it('removes well-known token shapes', () => {
    const input = [
      'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
      'token ghp_abcdefghijklmnopqrstuvwxyz0123456789',
      'openai sk-proj-abcdefghijklmnopqrstuvwxyz',
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    ].join('\n');
    const { text, counts } = redactText(input, rules);
    expect(text).not.toMatch(/AKIA|ghp_|sk-proj|eyJ/);
    expect(counts.secret).toBeGreaterThanOrEqual(4);
  });

  it('keeps the key name and drops the value on assignments', () => {
    const { text } = redactText('DATABASE_PASSWORD=hunter2hunter2 and api_key: "abcd1234"', rules);
    expect(text).toBe(`DATABASE_PASSWORD=${token('secret')} and api_key: "${token('secret')}"`);
  });

  it('strips credentials from URLs but keeps the host', () => {
    const { text } = redactText('postgres://app:s3cret@db.internal:5432/main', rules);
    expect(text).toBe(`postgres://app:${token('secret')}@db.internal:5432/main`);
  });

  it('redacts emails, addresses and home directories', () => {
    const { text, counts } = redactText(
      'from alice@example.com at 10.1.2.3 running /Users/alice/code/app on 2001:0db8:0000:0000:0000:ff00:0042:8329',
      rules,
    );
    expect(text).toContain(token('email'));
    expect(text).toContain(`/Users/${token('user')}/code/app`);
    expect(counts.ip).toBe(2);
    expect(counts.email).toBe(1);
    expect(counts.path).toBe(1);
  });

  it('leaves loopback and version strings alone', () => {
    const { text } = redactText(
      'listening on 127.0.0.1 with cachekit 3.2.0 and node 24.2.0 build 1.2.3.4.5',
      rules,
    );
    expect(text).toBe('listening on 127.0.0.1 with cachekit 3.2.0 and node 24.2.0 build 1.2.3.4.5');
  });

  it('removes private key blocks whole', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\nabc\n-----END RSA PRIVATE KEY-----';
    expect(redactText(`before\n${pem}\nafter`, rules).text).toBe(
      `before\n${token('secret')}\nafter`,
    );
  });

  it('applies literals and usernames from the config', () => {
    const custom = compileRules({ literals: ['acme-internal'], usernames: ['finisher'] });
    const { text } = redactText('deploy acme-internal as finisher from /home/finisher', custom);
    expect(text).toBe(`deploy ${token('custom')} as ${token('user')} from /home/${token('user')}`);
  });

  it('applies custom rules with group references', () => {
    const custom = compileRules({
      rules: [
        { id: 'ticket', category: 'custom', pattern: '(TICKET-)(\\d+)', caseInsensitive: false },
      ],
    });
    expect(redactText('see TICKET-4242', custom).text).toBe(`see ${token('custom')}`);
  });
});

describe('redactEnvContent', () => {
  it('keeps keys and comments, drops every value', () => {
    const input =
      '# database\nDATABASE_URL=postgres://x\nexport CACHE_DIR=/tmp/cache\nEMPTY=\nQUOTED="hello world"\n';
    const { text, counts } = redactEnvContent(input);
    expect(text).toBe(
      `# database\nDATABASE_URL=${token('env')}\nexport CACHE_DIR=${token('env')}\nEMPTY=\nQUOTED=${token('env')}\n`,
    );
    expect(counts.env).toBe(3);
  });
});

describe('redactValue', () => {
  it('walks nested payloads and treats dotenv files by value', () => {
    const payload = {
      type: 'config',
      files: [
        {
          path: '.env',
          content: 'STRIPE_KEY=sk_live_abcdefghijklmnop\nMODE=prod',
          bytes: 10,
          truncated: false,
        },
        {
          path: 'config/cache.yaml',
          content: 'dir: /Users/alice/.cache\nkey: sk-abcdefghijklmnopqrstuv',
          bytes: 10,
          truncated: false,
        },
      ],
    };
    const { value, report } = redactValue(payload, rules);
    expect(value.files[0]?.content).toBe(`STRIPE_KEY=${token('env')}\nMODE=${token('env')}`);
    expect(value.files[1]?.content).toBe(
      `dir: /Users/${token('user')}/.cache\nkey: ${token('secret')}`,
    );
    expect(report.total).toBe(4);
    expect(report.counts).toEqual({ env: 2, path: 1, secret: 1 });
    expect(value.files[0]?.path).toBe('.env');
  });
});
