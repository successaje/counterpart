import { EventEmitter } from 'node:events';
import path from 'node:path';
import {
  type Case,
  CaseSchema,
  type EvidenceRecord,
  EvidenceRecordSchema,
  type Release,
  toRelease,
} from '@counterpart/protocol';
import type { CounterpartPaths } from '../config/paths.js';
import type { RunnerEvent } from '../handle.js';
import { listJsonFiles, readJson, writeJsonAtomic } from './files.js';

/**
 * The ledger: every case and every record, one JSON file each, with an
 * in-memory index. Records are append-only in spirit; the runner rewrites a
 * record only while it moves from pending to a terminal status.
 */
export class Ledger {
  private readonly cases = new Map<string, Case>();
  private readonly records = new Map<string, EvidenceRecord>();
  readonly events = new EventEmitter<{ event: [RunnerEvent] }>();

  constructor(private readonly paths: CounterpartPaths) {}

  async load(): Promise<void> {
    for (const file of await listJsonFiles(this.paths.cases)) {
      const parsed = CaseSchema.safeParse(await readJson(file));
      if (parsed.success) this.cases.set(parsed.data.id, parsed.data);
    }
    for (const file of await listJsonFiles(this.paths.evidence)) {
      const parsed = EvidenceRecordSchema.safeParse(await readJson(file));
      if (parsed.success) this.records.set(parsed.data.id, parsed.data);
    }
  }

  private emit(event: RunnerEvent): void {
    this.events.emit('event', event);
  }

  getCase(id: string): Case | undefined {
    return this.cases.get(id);
  }

  listCases(): Case[] {
    return [...this.cases.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async putCase(c: Case, created = false): Promise<Case> {
    this.cases.set(c.id, c);
    await writeJsonAtomic(path.join(this.paths.cases, `${c.id}.json`), c);
    this.emit({ type: created ? 'case.created' : 'case.updated', case: c });
    return c;
  }

  getRecord(id: string): EvidenceRecord | undefined {
    return this.records.get(id);
  }

  listRecords(caseId?: string): EvidenceRecord[] {
    const all = [...this.records.values()].filter((r) => !caseId || r.request.caseId === caseId);
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  listReleases(caseId?: string): Release[] {
    return this.listRecords(caseId).map(toRelease);
  }

  async putRecord(r: EvidenceRecord, created = false): Promise<EvidenceRecord> {
    this.records.set(r.id, r);
    await writeJsonAtomic(path.join(this.paths.evidence, `${r.id}.json`), r);
    this.emit({ type: created ? 'record.created' : 'record.updated', record: toRelease(r) });
    return r;
  }

  announce(type: 'approval.requested' | 'approval.decided', r: EvidenceRecord): void {
    this.emit({ type, record: toRelease(r) });
  }
}
