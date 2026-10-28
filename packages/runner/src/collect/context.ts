import type { RunnerConfig } from '@counterpart/protocol';
import type { SandboxProbe } from './sandbox.js';

export interface CollectContext {
  root: string;
  config: RunnerConfig;
  sandbox: SandboxProbe;
}

export function execLimits(ctx: CollectContext, timeoutMs?: number) {
  return {
    timeoutMs: timeoutMs ?? ctx.config.limits.timeoutMs,
    maxLines: ctx.config.limits.maxLines,
    maxBytes: ctx.config.limits.maxBytes,
  };
}

/** Environment for commands the reporter chose: theirs, minus colour. */
export function projectEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    CI: process.env.CI ?? '1',
    TERM: 'dumb',
  };
}
