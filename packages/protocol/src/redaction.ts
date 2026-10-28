import type { RedactionRule } from './config.js';
import type { RedactionReport } from './record.js';

/**
 * Redaction runs on the reporter's machine before anything is released.
 *
 * It is pattern based. It will miss secrets that look like ordinary words and
 * it may over-redact version strings that look like addresses. Both are the
 * right failure direction for a tool whose job is to keep things in.
 */

export type RedactionCategory = 'secret' | 'email' | 'ip' | 'path' | 'env' | 'custom';

export function token(category: RedactionCategory | string): string {
  return `«redacted:${category}»`;
}

export interface CompiledRule {
  readonly id: string;
  readonly category: RedactionCategory;
  readonly pattern: RegExp;
  readonly replacement: string;
}

const SECRET = token('secret');

/**
 * Built-in rules, in the order they run. Specific shapes first so that the
 * generic assignment rule does not swallow a key name we would rather keep.
 */
export const BUILTIN_RULES: readonly CompiledRule[] = [
  {
    id: 'private-key-block',
    category: 'secret',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replacement: SECRET,
  },
  {
    id: 'aws-access-key',
    category: 'secret',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    replacement: SECRET,
  },
  {
    id: 'github-token',
    category: 'secret',
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
    replacement: SECRET,
  },
  {
    id: 'slack-token',
    category: 'secret',
    pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
    replacement: SECRET,
  },
  {
    id: 'sk-token',
    category: 'secret',
    pattern: /\bsk-(?:ant-|proj-|live-|test-)?[A-Za-z0-9_-]{16,}\b/g,
    replacement: SECRET,
  },
  {
    id: 'stripe-key',
    category: 'secret',
    pattern: /\b[pr]k_(?:live|test)_[A-Za-z0-9]{10,}\b/g,
    replacement: SECRET,
  },
  {
    id: 'jwt',
    category: 'secret',
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    replacement: SECRET,
  },
  {
    id: 'url-credentials',
    category: 'secret',
    pattern: /([a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:)([^@\s/]+)(@)/gi,
    replacement: `$1${SECRET}$3`,
  },
  {
    id: 'authorization-header',
    category: 'secret',
    pattern:
      /((?:authorization|proxy-authorization)\s*[:=]\s*(?:bearer|basic|token)\s+)[A-Za-z0-9._~+/=-]+/gi,
    replacement: `$1${SECRET}`,
  },
  {
    id: 'assignment',
    category: 'secret',
    pattern:
      /((?:api[_-]?key|secret|token|passw(?:or)?d|credential|private[_-]?key|access[_-]?key|client[_-]?secret|auth)[A-Za-z0-9_-]*["']?\s*[:=]\s*["']?)(?!«)([^\s"',;«]{4,})/gi,
    replacement: `$1${SECRET}`,
  },
  {
    id: 'email',
    category: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g,
    replacement: token('email'),
  },
  {
    id: 'ipv4',
    category: 'ip',
    // Four dotted octets, but not loopback, unspecified, or something followed by another dot (a version).
    pattern: /(?<![\d.])\b(?!127\.0\.0\.1\b)(?!0\.0\.0\.0\b)(?:\d{1,3}\.){3}\d{1,3}\b(?!\.\d)/g,
    replacement: token('ip'),
  },
  {
    id: 'ipv6',
    category: 'ip',
    pattern: /\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\b/gi,
    replacement: token('ip'),
  },
  {
    id: 'home-path',
    category: 'path',
    pattern: /(\/(?:Users|home)\/)([^/\s"'`:]+)/g,
    replacement: `$1${token('user')}`,
  },
  {
    id: 'windows-home-path',
    category: 'path',
    pattern: /([A-Za-z]:\\Users\\)([^\\\s"'`]+)/g,
    replacement: `$1${token('user')}`,
  },
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface RedactorOptions {
  rules?: readonly RedactionRule[];
  usernames?: readonly string[];
  literals?: readonly string[];
}

export function compileRules(options: RedactorOptions = {}): CompiledRule[] {
  const compiled: CompiledRule[] = [...BUILTIN_RULES];
  for (const literal of options.literals ?? []) {
    compiled.push({
      id: `literal:${literal}`,
      category: 'custom',
      pattern: new RegExp(escapeRegExp(literal), 'g'),
      replacement: token('custom'),
    });
  }
  for (const user of options.usernames ?? []) {
    compiled.push({
      id: `username:${user}`,
      category: 'path',
      pattern: new RegExp(`\\b${escapeRegExp(user)}\\b`, 'g'),
      replacement: token('user'),
    });
  }
  for (const rule of options.rules ?? []) {
    compiled.push({
      id: rule.id,
      category: rule.category,
      pattern: new RegExp(rule.pattern, rule.caseInsensitive ? 'gi' : 'g'),
      replacement: rule.replacement ?? token(rule.category),
    });
  }
  return compiled;
}

export interface RedactTextResult {
  text: string;
  counts: Record<string, number>;
  rulesApplied: string[];
}

export function redactText(input: string, rules: readonly CompiledRule[]): RedactTextResult {
  let text = input;
  const counts: Record<string, number> = {};
  const rulesApplied: string[] = [];
  for (const rule of rules) {
    let hits = 0;
    text = text.replace(rule.pattern, (...match) => {
      hits++;
      // Rebuild the replacement with group references.
      return rule.replacement.replace(/\$(\d)/g, (_, g: string) => {
        const idx = Number(g);
        const groups = match.slice(1, -2) as (string | undefined)[];
        return groups[idx - 1] ?? '';
      });
    });
    if (hits > 0) {
      counts[rule.category] = (counts[rule.category] ?? 0) + hits;
      rulesApplied.push(rule.id);
    }
  }
  return { text, counts, rulesApplied };
}

const ENV_LINE = /^([ \t]*(?:export[ \t]+)?[A-Za-z_][A-Za-z0-9_]*[ \t]*=[ \t]*)(.*\S.*)$/gm;

/**
 * Dotenv-style files: every value goes, every key stays. The helpdesk learns
 * which settings exist without learning what they are set to.
 */
export function redactEnvContent(content: string): RedactTextResult {
  let hits = 0;
  const text = content.replace(ENV_LINE, (_m, lhs: string, rhs: string) => {
    if (rhs.trim().startsWith('#')) return `${lhs}${rhs}`;
    hits++;
    return `${lhs}${token('env')}`;
  });
  return {
    text,
    counts: hits ? { env: hits } : {},
    rulesApplied: hits ? ['env-file'] : [],
  };
}

export function looksLikeEnvFile(path: string): boolean {
  const base = path.split(/[\\/]/).pop() ?? '';
  return base === '.env' || base.startsWith('.env.') || base.endsWith('.env');
}

function merge(into: RedactTextResult, from: RedactTextResult): void {
  for (const [k, v] of Object.entries(from.counts)) into.counts[k] = (into.counts[k] ?? 0) + v;
  for (const id of from.rulesApplied)
    if (!into.rulesApplied.includes(id)) into.rulesApplied.push(id);
}

/**
 * Walks any JSON-like value and redacts every string in it. Keys are left
 * alone; they are structure, not data. Fields named `path` that point at a
 * dotenv file get env treatment for their sibling `content`.
 */
export function redactValue<T>(
  value: T,
  rules: readonly CompiledRule[],
): { value: T; report: RedactionReport } {
  const acc: RedactTextResult = { text: '', counts: {}, rulesApplied: [] };

  const walk = (v: unknown, envMode: boolean): unknown => {
    if (typeof v === 'string') {
      if (envMode) {
        const env = redactEnvContent(v);
        merge(acc, env);
        const r = redactText(env.text, rules);
        merge(acc, r);
        return r.text;
      }
      const r = redactText(v, rules);
      merge(acc, r);
      return r.text;
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, false));
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const isEnvFile =
        typeof o.path === 'string' && typeof o.content === 'string' && looksLikeEnvFile(o.path);
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(o)) out[k] = walk(x, isEnvFile && k === 'content');
      return out;
    }
    return v;
  };

  const redacted = walk(value, false) as T;
  const total = Object.values(acc.counts).reduce((a, b) => a + b, 0);
  return { value: redacted, report: { counts: acc.counts, total, rulesApplied: acc.rulesApplied } };
}
