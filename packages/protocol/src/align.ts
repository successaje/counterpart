import type { Payload } from './record.js';

/**
 * Lines a raw text up against its redacted release so the owner can see
 * exactly which spans were removed and what replaced them.
 *
 * The redactor only ever replaces spans with `«redacted:category»` tokens, so
 * the text between two tokens in the release is text that survived verbatim.
 * Walking those literal pieces through the raw text recovers the removed
 * spans without a general diff.
 */

export type AlignedSegment =
  | { kind: 'kept'; text: string }
  | { kind: 'removed'; text: string; token: string; category: string };

const TOKEN = /«redacted:([a-z-]+)»/g;

export function alignRedaction(raw: string, released: string): AlignedSegment[] | null {
  if (raw === released) return raw ? [{ kind: 'kept', text: raw }] : [];

  // released = L0 T1 L1 T2 L2 … Tn Ln
  const literals: string[] = [];
  const tokens: Array<{ token: string; category: string }> = [];
  let last = 0;
  for (const m of released.matchAll(TOKEN)) {
    literals.push(released.slice(last, m.index));
    tokens.push({ token: m[0], category: m[1] ?? 'unknown' });
    last = m.index + m[0].length;
  }
  literals.push(released.slice(last));
  if (tokens.length === 0) return null;

  const segments: AlignedSegment[] = [];
  const head = literals[0] ?? '';
  if (!raw.startsWith(head)) return null;
  if (head) segments.push({ kind: 'kept', text: head });
  let cursor = head.length;

  let i = 0;
  while (i < tokens.length) {
    // Adjacent tokens with nothing between them are one removed span.
    let j = i;
    while (j + 1 < tokens.length && literals[j + 1] === '') j++;
    const next = literals[j + 1] ?? '';
    const isLast = j === tokens.length - 1;
    let end: number;
    if (isLast) {
      if (!raw.endsWith(next) || raw.length - next.length < cursor) return null;
      end = raw.length - next.length;
    } else {
      end = raw.indexOf(next, cursor);
      if (end < 0) return null;
    }
    const group = tokens.slice(i, j + 1);
    segments.push({
      kind: 'removed',
      text: raw.slice(cursor, end),
      token: group.map((t) => t.token).join(''),
      category: group[0]?.category ?? 'unknown',
    });
    cursor = end;
    if (next) segments.push({ kind: 'kept', text: next });
    cursor += next.length;
    i = j + 1;
  }

  const rebuilt = segments.map((s) => (s.kind === 'kept' ? s.text : s.token)).join('');
  return rebuilt === released && cursor === raw.length ? segments : null;
}

export interface RedactedField {
  /** Dotted path inside the payload, e.g. `files.0.content`. */
  path: string;
  /** What to call it on screen: the file path, `stdout`, `patch`. */
  label: string;
  raw: string;
  released: string;
}

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function labelFor(payload: Payload, path: readonly (string | number)[]): string {
  const [a, b, c] = path;
  if (a === 'files' && typeof b === 'number' && payload.type === 'config') {
    return payload.files[b]?.path ?? `file ${b}`;
  }
  if (a === 'output' && typeof b === 'string') return b;
  if (a === 'verify' && b === 'output' && typeof c === 'string') return `verify · ${c}`;
  if (a === 'stat') return 'git diff --stat';
  if (a === 'commits' && typeof b === 'number' && payload.type === 'diff') {
    return `commit ${payload.commits[b]?.sha ?? b}`;
  }
  if (a === 'packages' && typeof b === 'number' && payload.type === 'versions') {
    return `package ${payload.packages[b]?.name ?? b}`;
  }
  if (a === 'applyOutput') return 'apply output';
  return path.join('.');
}

/**
 * Every string in the payload that the redactor changed, with the raw and
 * released versions side by side. Structure is identical on both sides, so
 * the walk is in lockstep.
 */
export function redactedFields(raw: Payload, released: Payload): RedactedField[] {
  const out: RedactedField[] = [];
  const walk = (a: Json, b: Json, path: (string | number)[]) => {
    if (typeof a === 'string' && typeof b === 'string') {
      if (a !== b) {
        out.push({ path: path.join('.'), label: labelFor(released, path), raw: a, released: b });
      }
      return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      a.forEach((item, i) => {
        const other = b[i];
        if (other !== undefined) walk(item, other, [...path, i]);
      });
      return;
    }
    if (
      a &&
      b &&
      typeof a === 'object' &&
      typeof b === 'object' &&
      !Array.isArray(a) &&
      !Array.isArray(b)
    ) {
      for (const k of Object.keys(a)) {
        const other = b[k];
        const mine = a[k];
        if (mine !== undefined && other !== undefined) walk(mine, other, [...path, k]);
      }
    }
  };
  walk(raw as unknown as Json, released as unknown as Json, []);
  return out;
}
