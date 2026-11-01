import { readFile } from 'node:fs/promises';
import { CASE_STATE_LABEL, formatEvidenceCard, parseEvidenceCard } from '@counterpart/protocol';
import type { RunnerHandle } from '@counterpart/runner';
import {
  caseText,
  describeApproval,
  draftCard,
  payloadText,
  releaseHeadline,
} from '../mcp/format.js';
import { columns, heading, relative, ui } from '../ui.js';

export async function listCases(handle: RunnerHandle, all: boolean, json = false): Promise<void> {
  const cases = await handle.listCases(all ? {} : { open: true });
  if (json) {
    console.log(JSON.stringify(cases, null, 2));
    return;
  }
  if (cases.length === 0) {
    console.log(ui.dim(all ? 'no cases yet' : 'no open cases'));
    return;
  }
  console.log(
    columns(
      cases.map((c) => [
        ui.code(c.id),
        CASE_STATE_LABEL[c.state],
        c.summary,
        ui.dim(relative(c.updatedAt)),
      ]),
      0,
    ),
  );
}

export async function showCase(
  handle: RunnerHandle,
  id: string,
  full: boolean,
  json = false,
): Promise<void> {
  const [c, releases] = await Promise.all([handle.getCase(id), handle.listRecords(id)]);
  if (json) {
    console.log(JSON.stringify({ case: c, records: releases }, null, 2));
    return;
  }
  console.log(caseText(c, releases));
  if (full) {
    for (const r of releases) {
      console.log(heading(`${releaseHeadline(r)}  ${ui.dim(r.id)}`));
      console.log(`  ${ui.dim(describeApproval(r))}${r.reason ? `  ${ui.warn(r.reason)}` : ''}`);
      if (r.released) console.log(payloadText(r.released).replace(/^/gm, '  '));
    }
  }
}

export async function printCard(handle: RunnerHandle, id: string): Promise<void> {
  const [c, releases] = await Promise.all([handle.getCase(id), handle.listRecords(id)]);
  console.log(formatEvidenceCard(draftCard(c, releases)));
}

export async function validateCard(file: string): Promise<boolean> {
  const text = file === '-' ? await readStdin() : await readFile(file, 'utf8');
  const parsed = parseEvidenceCard(text);
  if (parsed.success) {
    console.log(
      `${ui.ok('✓')} valid evidence card for ${parsed.data.caseId} (confidence: ${parsed.data.confidence})`,
    );
    return true;
  }
  console.log(`${ui.bad('✗')} not a valid evidence card`);
  for (const issue of parsed.error.issues)
    console.log(`  ${issue.path.join('.') || '(card)'}: ${issue.message}`);
  return false;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}
