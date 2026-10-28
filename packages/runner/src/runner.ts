import { createRequire } from 'node:module';
import os from 'node:os';
import {
  type Approval,
  approvalPolicyFor,
  CASE_STATES,
  type Case,
  CaseTransitionError,
  type CompiledRule,
  compileRules,
  EVIDENCE_INFO,
  EVIDENCE_TYPES,
  type EvidenceRecord,
  type EvidenceRequest,
  type EvidenceType,
  isOpen,
  newId,
  type Principal,
  type Release,
  type RunnerConfig,
  redactValue,
  toRelease,
  transitionCase,
  validateRequest,
} from '@counterpart/protocol';
import { type CollectContext, collect, detectSandbox, type SandboxProbe } from './collect/index.js';
import { loadConfig } from './config/load.js';
import { pathsFor } from './config/paths.js';
import {
  type CaseFilter,
  type CollectInput,
  type CollectResult,
  type Decision,
  type OpenCaseInput,
  type RefuseInput,
  RunnerError,
  type RunnerEvent,
  type RunnerHandle,
  type RunnerInfo,
  type UpdateCaseInput,
} from './handle.js';
import { Ledger } from './store/ledger.js';

const require = createRequire(import.meta.url);
const { version: RUNNER_VERSION } = require('../package.json') as { version: string };

/** The runner acting on its own: automatic approvals, housekeeping. */
export const RUNNER_PRINCIPAL: Principal = {
  kind: 'agent',
  name: 'counterpart-runner',
  side: 'reporter',
};

export interface RunnerOptions {
  root: string;
  config: RunnerConfig;
  ledger: Ledger;
  sandbox: SandboxProbe;
  /** Where the owner can approve, if a Desk is being served. */
  deskUrl?: () => string | null;
}

const TERMINAL = new Set(['released', 'declined', 'refused', 'failed', 'expired']);

export class Runner implements RunnerHandle {
  readonly root: string;
  readonly config: RunnerConfig;
  readonly ledger: Ledger;
  readonly sandbox: SandboxProbe;
  deskUrl: () => string | null;
  private readonly rules: CompiledRule[];
  private readonly expiry = new Map<string, NodeJS.Timeout>();

  constructor(opts: RunnerOptions) {
    this.root = opts.root;
    this.config = opts.config;
    this.ledger = opts.ledger;
    this.sandbox = opts.sandbox;
    this.deskUrl = opts.deskUrl ?? (() => null);
    const me = (() => {
      try {
        return os.userInfo().username;
      } catch {
        return null;
      }
    })();
    this.rules = compileRules({
      rules: this.config.redaction.rules,
      usernames: [...this.config.redaction.usernames, ...(me ? [me] : [])],
      literals: this.config.redaction.literals,
    });
  }

  static async open(root: string, opts: { deskUrl?: () => string | null } = {}): Promise<Runner> {
    const config = await loadConfig(root);
    const ledger = new Ledger(pathsFor(root));
    await ledger.load();
    const sandbox = await detectSandbox();
    const runner = new Runner({ root, config, ledger, sandbox, ...opts });
    await runner.recover();
    return runner;
  }

  /** Records left mid-flight by a previous process cannot be trusted; close them. */
  private async recover(): Promise<void> {
    const now = new Date().toISOString();
    for (const r of this.ledger.listRecords()) {
      if (r.status === 'pending') {
        await this.ledger.putRecord({
          ...r,
          status: 'expired',
          reason: 'the runner restarted while this request was waiting for approval.',
          finishedAt: now,
          updatedAt: now,
        });
      } else if (r.status === 'collecting') {
        await this.ledger.putRecord({
          ...r,
          status: 'failed',
          reason: 'the runner restarted while collecting; nothing was released.',
          finishedAt: now,
          updatedAt: now,
        });
      }
    }
  }

  subscribe(listener: (event: RunnerEvent) => void): () => void {
    this.ledger.events.on('event', listener);
    return () => this.ledger.events.off('event', listener);
  }

  async info(): Promise<RunnerInfo> {
    const approvals = Object.fromEntries(
      EVIDENCE_TYPES.map((t) => [t, approvalPolicyFor(this.config, t)]),
    ) as RunnerInfo['approvals'];
    const desk = this.deskUrl();
    return {
      version: RUNNER_VERSION,
      projectRoot: this.root,
      project: this.config.project,
      menu: this.config.menu,
      configPaths: this.config.configPaths,
      approvals,
      evidence: EVIDENCE_TYPES.map((t) => EVIDENCE_INFO[t]),
      limits: this.config.limits,
      desk: desk ? { url: desk } : null,
      sandbox: {
        available: this.sandbox.adapter !== null,
        adapter: this.sandbox.adapter?.name ?? null,
        ...(this.sandbox.reason ? { reason: this.sandbox.reason } : {}),
      },
    };
  }

  // ─── cases ────────────────────────────────────────────────────────────────

  async openCase(input: OpenCaseInput): Promise<Case> {
    const now = new Date().toISOString();
    const c: Case = {
      id: newId('case'),
      project: this.config.project.name,
      summary: input.summary,
      ...(input.dependency ? { dependency: input.dependency } : {}),
      ...(input.helpdesk ? { helpdesk: input.helpdesk } : {}),
      ...(input.thread ? { thread: input.thread } : {}),
      state: 'reported',
      history: [],
      recordIds: [],
      trusted: [],
      createdAt: now,
      updatedAt: now,
    };
    return this.ledger.putCase(c, true);
  }

  async getCase(id: string): Promise<Case> {
    const c = this.ledger.getCase(id);
    if (!c) throw new RunnerError('not-found', `no case ${id}`);
    return c;
  }

  async listCases(filter: CaseFilter = {}): Promise<Case[]> {
    return this.ledger
      .listCases()
      .filter((c) => filter.open === undefined || isOpen(c) === filter.open);
  }

  async updateCase(id: string, input: UpdateCaseInput): Promise<Case> {
    let c = await this.getCase(id);
    if (input.state && input.state !== c.state) {
      if (!CASE_STATES.includes(input.state))
        throw new RunnerError('invalid', `unknown state ${input.state}`);
      try {
        c = transitionCase(c, input.state, input.by, input.note);
      } catch (err) {
        if (err instanceof CaseTransitionError) throw new RunnerError('invalid', err.message);
        throw err;
      }
    } else if (input.note) {
      c = {
        ...c,
        history: [
          ...c.history,
          {
            from: c.state,
            to: c.state,
            at: new Date().toISOString(),
            by: input.by,
            note: input.note,
          },
        ],
      };
    }
    c = {
      ...c,
      ...(input.resolution ? { resolution: input.resolution } : {}),
      ...(input.helpdesk ? { helpdesk: input.helpdesk } : {}),
      ...(input.thread ? { thread: input.thread } : {}),
      ...(input.dependency ? { dependency: input.dependency } : {}),
      ...(input.summary ? { summary: input.summary } : {}),
      updatedAt: new Date().toISOString(),
    };
    return this.ledger.putCase(c);
  }

  async revokeTrust(caseId: string, type: EvidenceType): Promise<Case> {
    const c = await this.getCase(caseId);
    return this.ledger.putCase({
      ...c,
      trusted: c.trusted.filter((t) => t !== type),
      updatedAt: new Date().toISOString(),
    });
  }

  private async requireOpenCase(id: string): Promise<Case> {
    const c = await this.getCase(id);
    if (!isOpen(c))
      throw new RunnerError('case-closed', `case ${id} is ${c.state}; open a new case.`);
    return c;
  }

  private async advance(c: Case, to: Case['state'], by: Principal, note: string): Promise<Case> {
    const fresh = this.ledger.getCase(c.id) ?? c;
    if (fresh.state !== to && FORWARD_AUTO[fresh.state]?.includes(to)) {
      return this.ledger.putCase(transitionCase(fresh, to, by, note));
    }
    return fresh;
  }

  // ─── records ──────────────────────────────────────────────────────────────

  private async newRecord(
    request: EvidenceRequest,
    status: EvidenceRecord['status'],
    extra: Partial<EvidenceRecord> = {},
  ): Promise<EvidenceRecord> {
    const now = new Date().toISOString();
    const record: EvidenceRecord = {
      id: newId('rec'),
      request,
      status,
      approval: null,
      raw: null,
      released: null,
      redaction: null,
      createdAt: now,
      updatedAt: now,
      ...extra,
    };
    await this.ledger.putRecord(record, true);
    const c = this.ledger.getCase(request.caseId);
    if (c) {
      await this.ledger.putCase({ ...c, recordIds: [...c.recordIds, record.id], updatedAt: now });
    }
    return record;
  }

  private async refuseRecord(
    input: CollectInput | RefuseInput,
    reason: string,
    given?: unknown,
  ): Promise<Release> {
    const now = new Date().toISOString();
    const request: EvidenceRequest = {
      id: newId('req'),
      caseId: input.caseId,
      requestedBy: input.requestedBy,
      requestText: input.requestText,
      ...(input.thread ? { thread: input.thread } : {}),
      createdAt: now,
      type: 'other',
      args: {
        asked: 'type' in input ? input.type : 'request',
        ...(given !== undefined ? { given } : {}),
      },
    };
    const record = await this.newRecord(request, 'refused', { reason, finishedAt: now });
    return toRelease(record);
  }

  async refuse(input: RefuseInput): Promise<Release> {
    await this.requireOpenCase(input.caseId);
    return this.refuseRecord(input, input.reason);
  }

  async collect(input: CollectInput, waitMs = 90_000): Promise<CollectResult> {
    const c = await this.requireOpenCase(input.caseId);
    const validation = validateRequest(this.config, input.type, input.args);
    if (!validation.ok) {
      const release = await this.refuseRecord(input, validation.reason, input.args);
      return { status: 'refused', release };
    }
    if (validation.args.type === 'repro' && !this.sandbox.adapter) {
      const release = await this.refuseRecord(
        input,
        `E4 needs a network sandbox and none is available on this machine: ${this.sandbox.reason ?? 'unknown reason'}`,
        input.args,
      );
      return { status: 'refused', release };
    }

    const now = new Date().toISOString();
    const request: EvidenceRequest = {
      id: newId('req'),
      caseId: input.caseId,
      requestedBy: input.requestedBy,
      requestText: input.requestText,
      ...(input.thread ? { thread: input.thread } : {}),
      createdAt: now,
      ...validation.args,
    };
    const record = await this.newRecord(request, 'pending');
    await this.advance(
      c,
      'evidence-requested',
      input.requestedBy,
      `${EVIDENCE_INFO[validation.args.type].code} requested`,
    );

    const policy = approvalPolicyFor(this.config, validation.args.type);
    const trusted = (this.ledger.getCase(c.id) ?? c).trusted.includes(validation.args.type);
    if (policy === 'automatic' || trusted) {
      const approval: Approval = trusted
        ? { policy: 'ask', decision: 'allowed-for-case', via: 'case-trust', decidedAt: now }
        : { policy: 'automatic', decision: 'automatic', via: 'policy', decidedAt: now };
      const done = await this.run({ ...record, approval });
      return this.result(done);
    }

    this.ledger.announce('approval.requested', record);
    this.armExpiry(record.id);
    return this.awaitRecord(record.id, waitMs);
  }

  private armExpiry(recordId: string): void {
    const timer = setTimeout(async () => {
      this.expiry.delete(recordId);
      const r = this.ledger.getRecord(recordId);
      if (r?.status !== 'pending') return;
      const now = new Date().toISOString();
      await this.ledger.putRecord({
        ...r,
        status: 'expired',
        approval: { policy: 'ask', decision: 'expired', via: 'policy', decidedAt: now },
        reason: `nobody decided within ${Math.round(this.config.limits.approvalWaitMs / 60000)} minutes.`,
        finishedAt: now,
        updatedAt: now,
      });
    }, this.config.limits.approvalWaitMs);
    timer.unref();
    this.expiry.set(recordId, timer);
  }

  async awaitRecord(recordId: string, waitMs = 90_000): Promise<CollectResult> {
    const started = Date.now();
    const record = this.ledger.getRecord(recordId);
    if (!record) throw new RunnerError('not-found', `no record ${recordId}`);
    if (TERMINAL.has(record.status)) return this.result(record);

    const settled = await new Promise<EvidenceRecord | null>((resolve) => {
      const timer = setTimeout(() => {
        off();
        resolve(null);
      }, waitMs);
      const off = this.subscribe((event) => {
        if (
          event.type === 'record.updated' &&
          event.record.id === recordId &&
          TERMINAL.has(event.record.status)
        ) {
          clearTimeout(timer);
          off();
          resolve(this.ledger.getRecord(recordId) ?? null);
        }
      });
    });
    if (settled) return this.result(settled);
    const current = this.ledger.getRecord(recordId);
    if (current && TERMINAL.has(current.status)) return this.result(current);
    if (current?.status === 'collecting') return { status: 'collecting', recordId };
    return {
      status: 'pending',
      recordId,
      approvalUrl: this.deskUrl(),
      waitedMs: Date.now() - started,
    };
  }

  async decide(recordId: string, decision: Decision): Promise<CollectResult> {
    const record = this.ledger.getRecord(recordId);
    if (!record) throw new RunnerError('not-found', `no record ${recordId}`);
    if (record.status !== 'pending') {
      throw new RunnerError('not-pending', `record ${recordId} is ${record.status}, not pending.`);
    }
    const timer = this.expiry.get(recordId);
    if (timer) clearTimeout(timer);
    this.expiry.delete(recordId);

    const now = new Date().toISOString();
    const approval: Approval = {
      policy: 'ask',
      decision: decision.decision,
      via: decision.via,
      decidedAt: now,
      ...(decision.note ? { note: decision.note } : {}),
    };
    if (decision.decision === 'declined') {
      const declined = await this.ledger.putRecord({
        ...record,
        status: 'declined',
        approval,
        reason: decision.note ?? 'declined by the owner.',
        finishedAt: now,
        updatedAt: now,
      });
      this.ledger.announce('approval.decided', declined);
      return this.result(declined);
    }
    if (decision.decision === 'allowed-for-case' && record.request.type !== 'other') {
      const c = this.ledger.getCase(record.request.caseId);
      if (c && !c.trusted.includes(record.request.type)) {
        await this.ledger.putCase({
          ...c,
          trusted: [...c.trusted, record.request.type],
          updatedAt: now,
        });
      }
    }
    this.ledger.announce('approval.decided', { ...record, approval });
    const done = await this.run({ ...record, approval });
    return this.result(done);
  }

  /** Approval is settled; collect, redact, release. */
  private async run(record: EvidenceRecord): Promise<EvidenceRecord> {
    const startedAt = new Date().toISOString();
    let current = await this.ledger.putRecord({
      ...record,
      status: 'collecting',
      startedAt,
      updatedAt: startedAt,
    });
    if (current.request.type === 'other') {
      return this.fail(current, 'cannot collect an untyped request.');
    }
    const req = current.request;
    const validation = validateRequest(this.config, req.type, req.args);
    if (!validation.ok) return this.fail(current, validation.reason);
    const ctx: CollectContext = { root: this.root, config: this.config, sandbox: this.sandbox };
    try {
      const raw = await collect(ctx, validation.args, validation.menuEntry);
      const { value: released, report } = redactValue(raw, this.rules);
      const finishedAt = new Date().toISOString();
      current = await this.ledger.putRecord({
        ...current,
        status: 'released',
        raw: this.config.redaction.keepRaw ? raw : null,
        released,
        redaction: report,
        finishedAt,
        updatedAt: finishedAt,
      });
      const c = this.ledger.getCase(req.caseId);
      if (c)
        await this.advance(
          c,
          'evidence-collected',
          RUNNER_PRINCIPAL,
          `${EVIDENCE_INFO[req.type].code} released`,
        );
      return current;
    } catch (err) {
      return this.fail(current, err instanceof Error ? err.message : String(err));
    }
  }

  private async fail(record: EvidenceRecord, reason: string): Promise<EvidenceRecord> {
    const now = new Date().toISOString();
    return this.ledger.putRecord({
      ...record,
      status: 'failed',
      reason,
      finishedAt: now,
      updatedAt: now,
    });
  }

  private result(record: EvidenceRecord): CollectResult {
    const release = toRelease(record);
    switch (record.status) {
      case 'released':
        return { status: 'released', release };
      case 'declined':
      case 'refused':
      case 'failed':
      case 'expired':
        return { status: record.status, release };
      case 'collecting':
        return { status: 'collecting', recordId: record.id };
      default:
        return { status: 'pending', recordId: record.id, approvalUrl: this.deskUrl(), waitedMs: 0 };
    }
  }

  async listRecords(caseId?: string): Promise<Release[]> {
    return this.ledger.listReleases(caseId);
  }

  async getRecord(id: string): Promise<EvidenceRecord> {
    const r = this.ledger.getRecord(id);
    if (!r) throw new RunnerError('not-found', `no record ${id}`);
    return r;
  }

  async pendingApprovals(): Promise<Release[]> {
    return this.ledger.listReleases().filter((r) => r.status === 'pending');
  }

  close(): void {
    for (const t of this.expiry.values()) clearTimeout(t);
    this.expiry.clear();
  }
}

/** Transitions the runner may take on its own as evidence moves. */
const FORWARD_AUTO: Partial<Record<Case['state'], Case['state'][]>> = {
  reported: ['evidence-requested'],
  'evidence-requested': ['evidence-collected'],
  'evidence-collected': ['evidence-requested'],
  diagnosed: ['evidence-requested'],
  'fix-proposed': ['evidence-requested'],
};
