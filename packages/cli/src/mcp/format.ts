import {
  CASE_STATE_LABEL,
  type Case,
  EVIDENCE_INFO,
  type EvidenceCard,
  evidenceInfo,
  type Payload,
  type Release,
} from '@counterpart/protocol';
import type { CollectResult, RunnerInfo } from '@counterpart/runner';

/**
 * Plain-text renderings for the MCP tools. The agent reads these; the Desk
 * renders the same objects as a UI.
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

function outputBlock(o: {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  truncated: boolean;
  timedOut: boolean;
}): string {
  const lines = [
    `exit ${o.exitCode ?? 'none'} · ${(o.durationMs / 1000).toFixed(1)}s${o.timedOut ? ' · TIMED OUT' : ''}${o.truncated ? ' · output truncated' : ''}`,
  ];
  if (o.stdout.trim()) lines.push('--- stdout ---', o.stdout.trimEnd());
  if (o.stderr.trim()) lines.push('--- stderr ---', o.stderr.trimEnd());
  return lines.join('\n');
}

export function payloadText(p: Payload): string {
  switch (p.type) {
    case 'versions': {
      const rt = Object.entries(p.runtime)
        .map(([k, v]) => `${k} ${v}`)
        .join(', ');
      const pk = p.packages.map((x) => `  ${x.name} ${x.version}  (${x.source})`).join('\n');
      return [
        `platform: ${p.platform}`,
        `runtime: ${rt || 'unknown'}`,
        `package manager: ${p.packageManager ?? 'none'}`,
        'packages:',
        pk || '  none',
      ].join('\n');
    }
    case 'config':
      return p.files
        .map(
          (f) =>
            `=== ${f.path} (${f.bytes} bytes${f.truncated ? ', truncated' : ''}) ===\n${f.content}`,
        )
        .join('\n\n');
    case 'command':
      return `$ ${p.argv.join(' ')}   (cwd ${p.cwd})\n${outputBlock(p.output)}`;
    case 'repro':
      return `sandbox: ${p.sandbox}\nshell: ${p.shell}\n${outputBlock(p.output)}`;
    case 'diff':
      return [
        `paths: ${p.paths.join(', ') || '(whole repository)'}`,
        `working tree: ${p.dirty ? 'has uncommitted changes' : 'clean'}`,
        'diff --stat against HEAD:',
        p.stat,
        'recent commits:',
        p.commits.map((c) => `  ${c.sha}  ${c.when.padEnd(14)}  ${c.subject}`).join('\n') ||
          '  none',
      ].join('\n');
    case 'apply-fix':
      return [
        `${p.description}`,
        p.applied ? 'patch applied to the working tree (not committed)' : 'patch NOT applied',
        p.applyOutput,
        p.verify
          ? `verification: ${p.verify.name}\n${outputBlock(p.verify.output)}`
          : 'verification: not run',
      ].join('\n');
  }
}

export function releaseHeadline(r: Release): string {
  if (r.request.type === 'other') return `request refused`;
  const info = EVIDENCE_INFO[r.request.type];
  const what =
    r.request.type === 'command'
      ? `${info.code} command \`${r.request.args.name}\``
      : r.request.type === 'apply-fix'
        ? `${info.code} apply-fix (${r.request.args.description})`
        : `${info.code} ${info.title.toLowerCase()}`;
  return what;
}

export function collectResultText(result: CollectResult): string {
  switch (result.status) {
    case 'released': {
      const r = result.release;
      const head = `${releaseHeadline(r)} — released (${describeApproval(r)}; ${redactionSummary(r)})`;
      return `${head}\nrecord ${r.id}\n\n${r.released ? payloadText(r.released) : ''}`;
    }
    case 'pending':
      return [
        `Waiting for the owner to approve ${result.recordId}.`,
        result.approvalUrl
          ? `They can decide in the Desk: ${result.approvalUrl}`
          : 'They can decide with `counterpart approvals` in a terminal.',
        `Call counterpart_await with record_id "${result.recordId}" to keep waiting. Do not ask the helpdesk to approve; only the owner can.`,
      ].join('\n');
    case 'collecting':
      return `Approved; collecting ${result.recordId} now. Call counterpart_await with record_id "${result.recordId}".`;
    case 'refused':
      return `Refused before approval: ${result.release.reason ?? 'outside the menu'}\nrecord ${result.release.id}\nTell the helpdesk in one line what is on the menu instead.`;
    case 'declined':
      return `The owner declined this request${result.release.approval?.note ? `: ${result.release.approval.note}` : '.'}\nrecord ${result.release.id}\nTell the helpdesk it was declined; do not retry the same request.`;
    case 'failed':
      return `Collection failed: ${result.release.reason ?? 'unknown error'}\nrecord ${result.release.id}`;
    case 'expired':
      return `Nobody decided in time; the request expired.\nrecord ${result.release.id}\nAsk the owner to check the Desk, then request again.`;
  }
}

export function caseText(c: Case, releases: Release[]): string {
  const lines = [
    `case ${c.id} — ${CASE_STATE_LABEL[c.state]}`,
    `project: ${c.project}${c.dependency ? `  dependency: ${c.dependency}` : ''}`,
    `summary: ${c.summary}`,
    c.helpdesk ? `helpdesk: ${c.helpdesk.name}` : null,
    c.thread ? `thread: ${c.thread}` : null,
    c.trusted.length ? `trusted for this case: ${c.trusted.join(', ')}` : null,
    c.resolution ? `resolution: ${c.resolution}` : null,
    '',
    'records:',
    ...(releases.length
      ? releases.map(
          (r) =>
            `  ${r.id}  ${r.status.padEnd(10)}  ${releaseHeadline(r)}  (${describeApproval(r)})`,
        )
      : ['  none yet']),
  ];
  return lines.filter((l) => l !== null).join('\n');
}

export function infoText(info: RunnerInfo): string {
  const menu = info.menu
    .map(
      (m) =>
        `  ${m.name.padEnd(12)} ${m.description}\n${' '.repeat(15)}$ ${[...m.run, ...m.verbose.map((v) => `[${v}]`)].join(' ')}`,
    )
    .join('\n');
  const policies = Object.entries(info.approvals)
    .map(([t, p]) => `${EVIDENCE_INFO[t as keyof typeof EVIDENCE_INFO].code} ${t}: ${p}`)
    .join(', ');
  return [
    `project: ${info.project.name}  (root ${info.projectRoot})`,
    info.project.reportsAgainst.length
      ? `reports against: ${info.project.reportsAgainst.join(', ')}`
      : null,
    '',
    'evidence types a helpdesk may request:',
    ...info.evidence.map((e) => `  ${e.code} ${e.type.padEnd(10)} ${e.summary}`),
    '',
    'menu (E3 command names and what E6 may verify with):',
    menu,
    '',
    `readable config paths (E2): ${info.configPaths.join(', ') || 'none'}`,
    `approval policy: ${policies}`,
    `network sandbox for E4: ${info.sandbox.available ? info.sandbox.adapter : `unavailable (${info.sandbox.reason ?? 'unknown'})`}`,
    info.desk
      ? `owner approves at: ${info.desk.url}`
      : 'owner approves with `counterpart approvals` (Desk not running)',
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/** Builds a draft evidence card from a case's releases. */
export function draftCard(
  c: Case,
  releases: Release[],
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
      const tail = (p.output.stderr || p.output.stdout).trim().split('\n').slice(-3).join(' / ');
      reproduction = `E3 ${p.name}${p.argv.length > 2 ? ' (verbose)' : ''}: exit ${p.output.exitCode ?? 'none'}${tail ? `; ${tail}` : ''}`;
    }
    if (p.type === 'repro') {
      const tail = (p.output.stderr || p.output.stdout).trim().split('\n').slice(-3).join(' / ');
      reproduction = `E4 script in ${p.sandbox}: exit ${p.output.exitCode ?? 'none'}${tail ? `; ${tail}` : ''}`;
    }
    if (r.approval && r.approval.decision !== 'automatic' && r.request.type !== 'other') {
      const info = evidenceInfo(r.request.type);
      approvals.push(
        `${info.code} ${r.request.type} ${describeApproval(r)} at ${r.approval.decidedAt}`,
      );
    }
  }
  const card: EvidenceCard = {
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
  return card;
}
