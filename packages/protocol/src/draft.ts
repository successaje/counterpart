import type { EvidenceCard } from './card.js';
import type { Case } from './case.js';
import { evidenceInfo } from './evidence.js';
import type { Release } from './record.js';

/**
 * Human sentences about a record, shared by the CLI, the MCP server and the
 * Desk so every surface says the same thing.
 */

export function describeApproval(r: Release): string {
  const a = r.approval;
  if (!a) return 'no approval recorded';
  switch (a.decision) {
    case 'automatic':
      return 'automatic by policy';
    case 'allowed-once':
      return `allowed once by the owner via ${a.via}`;
    case 'allowed-for-case':
      return a.via === 'case-trust'
        ? 'trusted for this case by the owner'
        : `allowed for this case by the owner via ${a.via}`;
    case 'declined':
      return `declined by the owner via ${a.via}`;
    case 'expired':
      return 'expired without a decision';
  }
}

export function redactionSummary(r: Release): string {
  const counts = r.redaction?.counts ?? {};
  const parts = Object.entries(counts).map(([k, v]) => `${v} ${k}`);
  return parts.length ? `redacted: ${parts.join(', ')}` : 'nothing needed redacting';
}

export function releaseHeadline(r: Release): string {
  if (r.request.type === 'other') return 'request refused';
  const info = evidenceInfo(r.request.type);
  if (r.request.type === 'command') return `${info.code} command \`${r.request.args.name}\``;
  if (r.request.type === 'apply-fix')
    return `${info.code} apply-fix (${r.request.args.description})`;
  return `${info.code} ${info.title.toLowerCase()}`;
}

function lastLines(text: string, n: number): string {
  return text.trim().split('\n').slice(-n).join(' / ');
}

/** Builds a draft evidence card from a case's releases. */
export function draftEvidenceCard(
  c: Case,
  releases: readonly Release[],
  overrides: Partial<Pick<EvidenceCard, 'title' | 'diagnosis' | 'fixTried' | 'confidence'>> = {},
): EvidenceCard {
  const env: string[] = [];
  const approvals: string[] = [];
  let reproduction = '';
  for (const r of releases) {
    if (r.status !== 'released' || !r.released) continue;
    const p = r.released;
    if (p.type === 'versions') {
      const rt = Object.entries(p.runtime)
        .map(([k, v]) => `${k} ${v}`)
        .join(', ');
      if (rt) env.push(rt);
      if (p.packages.length) env.push(p.packages.map((x) => `${x.name} ${x.version}`).join(', '));
      env.push(p.platform);
    }
    if (p.type === 'command') {
      const tail = lastLines(p.output.stderr || p.output.stdout, 3);
      reproduction = `E3 ${p.name}${p.argv.length > 2 ? ' (verbose)' : ''}: exit ${p.output.exitCode ?? 'none'}${tail ? `; ${tail}` : ''}`;
    }
    if (p.type === 'repro') {
      const tail = lastLines(p.output.stderr || p.output.stdout, 3);
      reproduction = `E4 script in ${p.sandbox}: exit ${p.output.exitCode ?? 'none'}${tail ? `; ${tail}` : ''}`;
    }
    if (r.approval && r.approval.decision !== 'automatic' && r.request.type !== 'other') {
      const info = evidenceInfo(r.request.type);
      approvals.push(
        `${info.code} ${r.request.type} ${describeApproval(r)} at ${r.approval.decidedAt}`,
      );
    }
  }
  return {
    caseId: c.id,
    title: overrides.title ?? c.summary,
    environment: env.length ? env : ['not collected yet'],
    reproduction: reproduction || 'not reproduced yet',
    confidence: overrides.confidence ?? 'unconfirmed',
    approvals,
    ...(overrides.diagnosis ? { diagnosis: overrides.diagnosis } : {}),
    ...(overrides.fixTried ? { fixTried: overrides.fixTried } : {}),
    ...(c.thread ? { thread: c.thread } : {}),
  };
}
