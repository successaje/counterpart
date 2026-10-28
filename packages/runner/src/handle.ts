import type {
  ApprovalPolicy,
  Case,
  CaseState,
  EvidenceRecord,
  EvidenceType,
  EvidenceTypeInfo,
  MenuEntry,
  Principal,
  Release,
  RunnerConfig,
} from '@counterpart/protocol';

/**
 * The runner's surface. The in-process `Runner` and the HTTP `RemoteRunner`
 * both implement it, so the CLI and MCP server do not care which one they got.
 */

export interface SandboxStatus {
  available: boolean;
  adapter: string | null;
  reason?: string;
}

export interface RunnerInfo {
  version: string;
  projectRoot: string;
  project: RunnerConfig['project'];
  menu: MenuEntry[];
  configPaths: string[];
  approvals: Record<EvidenceType, ApprovalPolicy>;
  evidence: EvidenceTypeInfo[];
  limits: RunnerConfig['limits'];
  desk: { url: string } | null;
  sandbox: SandboxStatus;
}

export interface OpenCaseInput {
  summary: string;
  dependency?: string;
  helpdesk?: Principal;
  thread?: string;
}

export interface UpdateCaseInput {
  by: Principal;
  state?: CaseState;
  note?: string;
  resolution?: string;
  helpdesk?: Principal;
  thread?: string;
  dependency?: string;
  summary?: string;
}

export interface CollectInput {
  caseId: string;
  type: string;
  args: unknown;
  requestedBy: Principal;
  requestText: string;
  thread?: string;
}

export interface RefuseInput {
  caseId: string;
  requestedBy: Principal;
  requestText: string;
  reason: string;
  thread?: string;
}

export type CollectResult =
  | { status: 'released'; release: Release }
  | { status: 'pending'; recordId: string; approvalUrl: string | null; waitedMs: number }
  | { status: 'collecting'; recordId: string }
  | { status: 'refused' | 'declined' | 'failed' | 'expired'; release: Release };

export interface Decision {
  decision: 'allowed-once' | 'allowed-for-case' | 'declined';
  via: 'desk' | 'cli';
  note?: string;
}

export type RunnerEvent =
  | { type: 'case.created' | 'case.updated'; case: Case }
  | { type: 'record.created' | 'record.updated'; record: Release }
  | { type: 'approval.requested' | 'approval.decided'; record: Release };

export interface CaseFilter {
  open?: boolean;
}

export interface RunnerHandle {
  info(): Promise<RunnerInfo>;
  /** Live events. Returns an unsubscribe function. */
  subscribe(listener: (event: RunnerEvent) => void): () => void;
  openCase(input: OpenCaseInput): Promise<Case>;
  getCase(id: string): Promise<Case>;
  listCases(filter?: CaseFilter): Promise<Case[]>;
  updateCase(id: string, input: UpdateCaseInput): Promise<Case>;
  revokeTrust(caseId: string, type: EvidenceType): Promise<Case>;
  collect(input: CollectInput, waitMs?: number): Promise<CollectResult>;
  awaitRecord(recordId: string, waitMs?: number): Promise<CollectResult>;
  refuse(input: RefuseInput): Promise<Release>;
  listRecords(caseId?: string): Promise<Release[]>;
  /** Includes `raw`. Only ever served to the owner's own machine. */
  getRecord(id: string): Promise<EvidenceRecord>;
  pendingApprovals(): Promise<Release[]>;
  decide(recordId: string, decision: Decision): Promise<CollectResult>;
}

export type RunnerErrorCode =
  | 'not-found'
  | 'case-closed'
  | 'invalid'
  | 'not-pending'
  | 'config'
  | 'unavailable'
  | 'unauthorized';

export class RunnerError extends Error {
  constructor(
    readonly code: RunnerErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RunnerError';
  }

  get httpStatus(): number {
    switch (this.code) {
      case 'not-found':
        return 404;
      case 'unauthorized':
        return 401;
      case 'unavailable':
        return 503;
      case 'case-closed':
      case 'not-pending':
        return 409;
      default:
        return 400;
    }
  }
}
