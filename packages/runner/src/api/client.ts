import type { Case, EvidenceRecord, EvidenceType, Release } from '@counterpart/protocol';
import {
  type CaseFilter,
  type CollectInput,
  type CollectResult,
  type Decision,
  type OpenCaseInput,
  type RefuseInput,
  RunnerError,
  type RunnerErrorCode,
  type RunnerEvent,
  type RunnerHandle,
  type RunnerInfo,
  type UpdateCaseInput,
} from '../handle.js';
import { TOKEN_HEADER } from './server.js';

/**
 * Talks to a running Counterpart server on the same machine. Used by the CLI
 * and MCP server when `counterpart desk` already owns the project's ledger.
 */
export class RemoteRunner implements RunnerHandle {
  constructor(
    readonly baseUrl: string,
    private readonly token: string,
  ) {}

  private async call<T>(
    method: string,
    path: string,
    body?: unknown,
    timeoutMs = 630_000,
  ): Promise<T> {
    const init: RequestInit = {
      method,
      headers: { 'content-type': 'application/json', [TOKEN_HEADER]: this.token },
      signal: AbortSignal.timeout(timeoutMs),
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await fetch(`${this.baseUrl}/api${path}`, init);
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      throw new RunnerError(
        (payload.error as RunnerErrorCode) ?? 'unavailable',
        payload.message ?? res.statusText,
      );
    }
    return (await res.json()) as T;
  }

  info() {
    return this.call<RunnerInfo>('GET', '/info');
  }
  openCase(input: OpenCaseInput) {
    return this.call<Case>('POST', '/cases', input);
  }
  getCase(id: string) {
    return this.call<Case>('GET', `/cases/${id}`);
  }
  listCases(filter: CaseFilter = {}) {
    const q = filter.open === undefined ? '' : `?open=${filter.open}`;
    return this.call<Case[]>('GET', `/cases${q}`);
  }
  updateCase(id: string, input: UpdateCaseInput) {
    return this.call<Case>('PATCH', `/cases/${id}`, input);
  }
  revokeTrust(caseId: string, type: EvidenceType) {
    return this.call<Case>('POST', `/cases/${caseId}/trust/${type}/revoke`, {});
  }
  collect(input: CollectInput, waitMs?: number) {
    return this.call<CollectResult>('POST', '/collect', { input, waitMs });
  }
  awaitRecord(recordId: string, waitMs?: number) {
    return this.call<CollectResult>('POST', `/records/${recordId}/await`, { waitMs });
  }
  refuse(input: RefuseInput) {
    return this.call<Release>('POST', '/refuse', input);
  }
  listRecords(caseId?: string) {
    return this.call<Release[]>(
      'GET',
      `/records${caseId ? `?caseId=${encodeURIComponent(caseId)}` : ''}`,
    );
  }
  getRecord(id: string) {
    return this.call<EvidenceRecord>('GET', `/records/${id}`);
  }
  pendingApprovals() {
    return this.call<Release[]>('GET', '/approvals');
  }
  decide(recordId: string, decision: Decision) {
    return this.call<CollectResult>('POST', `/approvals/${recordId}`, decision);
  }

  subscribe(listener: (event: RunnerEvent) => void): () => void {
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/api/events`, {
          headers: { [TOKEN_HEADER]: this.token },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) return;
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let idx = buffer.indexOf('\n\n');
          while (idx >= 0) {
            const frame = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const data = frame
              .split('\n')
              .filter((l) => l.startsWith('data:'))
              .map((l) => l.slice(5).trim())
              .join('\n');
            const eventName = frame
              .split('\n')
              .find((l) => l.startsWith('event:'))
              ?.slice(6)
              .trim();
            if (data && eventName && eventName !== 'hello' && eventName !== 'ping') {
              try {
                listener(JSON.parse(data) as RunnerEvent);
              } catch {
                // malformed frame; skip
              }
            }
            idx = buffer.indexOf('\n\n');
          }
        }
      } catch {
        // aborted or connection lost; the subscriber can resubscribe
      }
    })();
    return () => controller.abort();
  }

  async health(
    timeoutMs = 1500,
  ): Promise<{ ok: boolean; version: string; projectRoot: string } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) return null;
      return (await res.json()) as { ok: boolean; version: string; projectRoot: string };
    } catch {
      return null;
    }
  }
}
