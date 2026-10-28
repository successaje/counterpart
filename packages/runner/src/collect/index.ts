import type { EvidenceArgs, MenuEntry, Payload } from '@counterpart/protocol';
import { collectApplyFix } from './applyFix.js';
import { collectCommand } from './command.js';
import { collectConfig } from './config.js';
import type { CollectContext } from './context.js';
import { collectDiff } from './diff.js';
import { collectRepro } from './repro.js';
import { collectVersions } from './versions.js';

export async function collect(
  ctx: CollectContext,
  req: EvidenceArgs,
  menuEntry?: MenuEntry,
): Promise<Payload> {
  switch (req.type) {
    case 'versions':
      return collectVersions(ctx, req.args);
    case 'config':
      return collectConfig(ctx, req.args);
    case 'command':
      if (!menuEntry) throw new Error('command collection needs a menu entry');
      return collectCommand(ctx, req.args, menuEntry);
    case 'repro':
      return collectRepro(ctx, req.args);
    case 'diff':
      return collectDiff(ctx, req.args);
    case 'apply-fix':
      if (!menuEntry) throw new Error('apply-fix collection needs a verify entry');
      return collectApplyFix(ctx, req.args, menuEntry);
  }
}

export type { CollectContext } from './context.js';
export { execArgv, stripAnsi, truncateLines } from './exec.js';
export {
  detectSandbox,
  resetSandboxCache,
  type SandboxAdapter,
  type SandboxProbe,
} from './sandbox.js';
