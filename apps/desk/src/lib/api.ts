import type { Case, EvidenceRecord, EvidenceType, Release } from '@counterpart/protocol';

/**
 * Talks to the runner's local API. The token arrives once in the URL fragment
 * (`#token=…`) from `counterpart desk`; it is kept in localStorage for this
 * origin and never sent anywhere but 127.0.0.1.
 */

const TOKEN_KEY = 'counterpart.desk.token';
const TOKEN_HEADER = 'x-counterpart-token';

export interface RunnerInfo {
  version: string;
  projectRoot: string;
  project: { name: string; reportsAgainst: string[] };
  menu: Array<{
    name: string;
    description: string;
    run: string[];
    verbose: string[];
    cwd: string;
    timeoutMs?: number;
  }>;
  configPaths: string[];
  approvals: Record<EvidenceType, 'automatic' | 'ask'>;
  evidence: Array<{
    type: EvidenceType;
    code: string;
    title: string;
    summary: string;
    executes: boolean;
    mutates: boolean;
  }>;
  limits: { timeoutMs: number; maxLines: number; maxBytes: number; approvalWaitMs: number };
  desk: { url: string } | null;
  sandbox: { available: boolean; adapter: string | null; reason?: string };
}

export type CollectResult =
  | { status: 'released'; release: Release }
  | { status: 'pending'; recordId: string; approvalUrl: string | null; waitedMs: number }
  | { status: 'collecting'; recordId: string }
  | { status: 'refused' | 'declined' | 'failed' | 'expired'; release: Release };

export type DeskEvent =
  | { type: 'case.created' | 'case.updated'; case: Case }
  | { type: 'record.created' | 'record.updated'; record: Release }
  | { type: 'approval.requested' | 'approval.decided'; record: Release };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function readTokenFromLocation(): string | null {
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  const token = params.get('token');
  if (token) {
    saveToken(token);
    // Keep the address bar clean; the token lives in storage from here on.
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return token;
  }
  return getToken();
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // private mode; the session still works until reload
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** Accepts a bare token or a full Desk URL with `#token=`. */
export function tokenFromInput(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(/token=([A-Za-z0-9_-]+)/);
  if (m?.[1]) return m[1];
  return /^[A-Za-z0-9_-]{16,}$/.test(s) ? s : null;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { [TOKEN_HEADER]: token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ApiError(res.status, payload.error ?? 'error', payload.message ?? res.statusText);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => call<{ ok: boolean; version: string; project: string }>('GET', '/health'),
  info: () => call<RunnerInfo>('GET', '/info'),
  cases: () => call<Case[]>('GET', '/cases'),
  case: (id: string) => call<Case>('GET', `/cases/${id}`),
  records: (caseId?: string) =>
    call<Release[]>('GET', `/records${caseId ? `?caseId=${encodeURIComponent(caseId)}` : ''}`),
  record: (id: string) => call<EvidenceRecord>('GET', `/records/${id}`),
  pending: () => call<Release[]>('GET', '/approvals'),
  decide: (
    recordId: string,
    decision: 'allowed-once' | 'allowed-for-case' | 'declined',
    note?: string,
  ) =>
    call<CollectResult>('POST', `/approvals/${recordId}`, {
      decision,
      via: 'desk',
      ...(note ? { note } : {}),
    }),
  revokeTrust: (caseId: string, type: EvidenceType) =>
    call<Case>('POST', `/cases/${caseId}/trust/${type}/revoke`, {}),
  updateCase: (id: string, body: Record<string, unknown>) =>
    call<Case>('PATCH', `/cases/${id}`, body),
};

/**
 * Server-sent events. EventSource cannot set headers, so the token goes in
 * the query string; the server accepts either.
 */
/** The server pings every 15s; silence for longer than this means the stream is dead. */
const SILENCE_MS = 40_000;

/**
 * Live events over SSE. The browser reconnects a dropped stream on its own,
 * but not every drop is noticed promptly, so a watchdog treats a stream
 * that has gone quiet as dead: it reports offline and opens a fresh one.
 */
export function subscribe(
  onEvent: (e: DeskEvent) => void,
  onState: (live: boolean) => void,
): () => void {
  const token = getToken();
  const names = [
    'case.created',
    'case.updated',
    'record.created',
    'record.updated',
    'approval.requested',
    'approval.decided',
  ];
  let source: EventSource | null = null;
  let lastSeen = Date.now();
  let closed = false;

  const open = () => {
    source?.close();
    const es = new EventSource(`/api/events?token=${encodeURIComponent(token ?? '')}`);
    source = es;
    const seen = () => {
      lastSeen = Date.now();
    };
    for (const name of names) {
      es.addEventListener(name, (ev) => {
        seen();
        try {
          onEvent(JSON.parse((ev as MessageEvent).data) as DeskEvent);
        } catch {
          // malformed frame
        }
      });
    }
    es.addEventListener('ping', seen);
    es.addEventListener('hello', () => {
      seen();
      onState(true);
    });
    es.onopen = () => {
      seen();
      onState(true);
    };
    es.onerror = () => onState(false);
  };

  open();
  const watchdog = setInterval(() => {
    if (closed || Date.now() - lastSeen < SILENCE_MS) return;
    onState(false);
    lastSeen = Date.now();
    open();
  }, 10_000);

  return () => {
    closed = true;
    clearInterval(watchdog);
    source?.close();
  };
}
