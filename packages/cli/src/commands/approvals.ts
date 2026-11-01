import readline from 'node:readline/promises';
import { EVIDENCE_INFO, type Release } from '@counterpart/protocol';
import type { CollectResult, RunnerHandle } from '@counterpart/runner';
import { collectResultText, releaseHeadline } from '../mcp/format.js';
import { heading, relative, ui } from '../ui.js';

export function describeRequest(r: Release): string[] {
  const req = r.request;
  const lines = [
    `${ui.title(releaseHeadline(r))}  ${ui.dim(r.id)}`,
    `  asked by ${ui.code(req.requestedBy.name)} ${relative(req.createdAt)}: ${ui.dim(`"${req.requestText}"`)}`,
  ];
  if (req.type === 'command')
    lines.push(
      `  will run menu entry ${ui.code(req.args.name)}${req.args.verbose ? ' (verbose)' : ''}`,
    );
  if (req.type === 'config')
    lines.push(`  will read ${req.args.paths.map((p) => ui.code(p)).join(', ')}`);
  if (req.type === 'repro')
    lines.push(
      `  will run this script in a sandbox with no network:`,
      ...req.args.script.split('\n').map((l) => `    ${ui.dim(l)}`),
    );
  if (req.type === 'apply-fix')
    lines.push(
      `  will apply a patch (${req.args.description}) and re-run ${ui.code(req.args.verifyWith)}`,
    );
  if (req.type === 'diff')
    lines.push(
      `  will read git diff --stat and ${req.args.commits} commits for ${req.args.paths.join(', ') || 'the repository'}`,
    );
  if (req.type !== 'other') lines.push(`  ${ui.dim(EVIDENCE_INFO[req.type].summary)}`);
  return lines;
}

export async function listApprovals(handle: RunnerHandle, json = false): Promise<void> {
  const pending = await handle.pendingApprovals();
  if (json) {
    console.log(JSON.stringify(pending, null, 2));
    return;
  }
  if (pending.length === 0) {
    console.log(ui.dim('nothing is waiting for your decision'));
    return;
  }
  console.log(heading(`${pending.length} request(s) waiting`));
  for (const r of pending) {
    console.log('');
    for (const line of describeRequest(r)) console.log(line);
  }
  console.log(
    `\n${ui.dim('decide with')} ${ui.code('counterpart approve <id> [--for-case]')} ${ui.dim('or')} ${ui.code('counterpart decline <id>')}`,
  );
}

export async function decide(
  handle: RunnerHandle,
  recordId: string,
  decision: 'allowed-once' | 'allowed-for-case' | 'declined',
  note?: string,
  json = false,
): Promise<CollectResult> {
  const result = await handle.decide(recordId, { decision, via: 'cli', ...(note ? { note } : {}) });
  console.log(json ? JSON.stringify(result, null, 2) : collectResultText(result));
  return result;
}

/**
 * Follows the ledger live. On a TTY, each new request can be decided inline.
 */
export async function watch(handle: RunnerHandle, interactive: boolean): Promise<void> {
  const rl = interactive
    ? readline.createInterface({ input: process.stdin, output: process.stdout })
    : null;
  const queue: Release[] = [];
  let busy = false;

  const drain = async () => {
    if (busy || !rl) return;
    busy = true;
    while (queue.length) {
      const r = queue.shift();
      if (!r) break;
      const fresh = (await handle.pendingApprovals()).find((p) => p.id === r.id);
      if (!fresh) continue;
      console.log('');
      for (const line of describeRequest(fresh)) console.log(line);
      const answer = (
        await rl.question(
          `  ${ui.label('[a]')}llow once  ${ui.label('[c]')} allow for this case  ${ui.label('[d]')}ecline  ${ui.label('[s]')}kip › `,
        )
      )
        .trim()
        .toLowerCase();
      if (answer === 'a') await decide(handle, fresh.id, 'allowed-once');
      else if (answer === 'c') await decide(handle, fresh.id, 'allowed-for-case');
      else if (answer === 'd')
        await decide(handle, fresh.id, 'declined', 'declined from the terminal');
      else console.log(ui.dim('  skipped; it stays pending'));
    }
    busy = false;
  };

  for (const r of await handle.pendingApprovals()) queue.push(r);
  void drain();

  console.log(
    ui.dim(
      `watching the ledger${interactive ? '; new requests will prompt you here' : ''}. Ctrl-C to stop.`,
    ),
  );
  const off = handle.subscribe((event) => {
    switch (event.type) {
      case 'approval.requested':
        if (rl) {
          queue.push(event.record);
          void drain();
        } else {
          console.log('');
          for (const line of describeRequest(event.record)) console.log(line);
        }
        break;
      case 'record.updated':
        if (
          ['released', 'declined', 'refused', 'failed', 'expired'].includes(event.record.status)
        ) {
          console.log(
            `${ui.dim(relative(event.record.updatedAt))}  ${event.record.status.padEnd(9)} ${releaseHeadline(event.record)} ${ui.dim(event.record.id)}`,
          );
        }
        break;
      case 'case.created':
        console.log(`${ui.dim('case opened')}  ${event.case.id}  ${event.case.summary}`);
        break;
      default:
        break;
    }
  });

  await new Promise<void>((resolve) => {
    const stop = () => {
      off();
      rl?.close();
      resolve();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });
}
