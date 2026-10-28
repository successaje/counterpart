import type { MenuEntry, RunnerConfig } from './config.js';
import {
  type EvidenceArgs,
  EvidenceArgsSchema,
  type EvidenceType,
  evidenceInfo,
} from './evidence.js';

/**
 * Validation happens before approval. A request that fails here is refused,
 * recorded, and never shown to the owner as something to approve.
 */

export type ValidationResult =
  | { ok: true; args: EvidenceArgs; menuEntry?: MenuEntry }
  | { ok: false; reason: string };

/**
 * Minimal glob matcher for config paths: `*` within a segment, `**` across
 * segments. Enough for `config/*.yaml` and `src/**`; nothing more is promised.
 */
export function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++;
      } else {
        re += '[^/]*';
      }
    } else if (ch === '?') {
      re += '[^/]';
    } else if (ch && /[.+^${}()|[\]\\]/.test(ch)) {
      re += `\\${ch}`;
    } else {
      re += ch;
    }
  }
  return new RegExp(`^${re}$`);
}

export function normalisePath(p: string): string {
  const parts: string[] = [];
  for (const seg of p.replace(/\\/g, '/').split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (parts.length === 0) return '..'; // escapes the root
      parts.pop();
      continue;
    }
    parts.push(seg);
  }
  return parts.join('/');
}

export function isPathAllowed(path: string, allowed: readonly string[]): boolean {
  const norm = normalisePath(path);
  if (norm === '..' || norm.startsWith('../') || norm === '') return false;
  return allowed.some((g) => globToRegExp(normalisePath(g)).test(norm));
}

export function validateRequest(
  config: RunnerConfig,
  type: string,
  rawArgs: unknown,
): ValidationResult {
  const parsed = EvidenceArgsSchema.safeParse({ type, args: rawArgs ?? {} });
  if (!parsed.success) {
    const known = ['versions', 'config', 'command', 'repro', 'diff', 'apply-fix'];
    if (!known.includes(type)) {
      return {
        ok: false,
        reason: `"${type}" is not an evidence type. The menu offers: ${known.join(', ')}.`,
      };
    }
    const first = parsed.error.issues[0];
    return {
      ok: false,
      reason:
        `arguments for ${type} are invalid: ${first?.path.join('.') ?? ''} ${first?.message ?? ''}`.trim(),
    };
  }
  const req = parsed.data;
  switch (req.type) {
    case 'command': {
      const entry = config.menu.find((m) => m.name === req.args.name);
      if (!entry) {
        return {
          ok: false,
          reason: `"${req.args.name}" is not on the menu. Available: ${config.menu.map((m) => m.name).join(', ')}.`,
        };
      }
      return { ok: true, args: req, menuEntry: entry };
    }
    case 'apply-fix': {
      const entry = config.menu.find((m) => m.name === req.args.verifyWith);
      if (!entry) {
        return {
          ok: false,
          reason: `"${req.args.verifyWith}" is not on the menu, so the fix could not be verified. Available: ${config.menu.map((m) => m.name).join(', ')}.`,
        };
      }
      if (!/^(diff --git|--- |Index: |@@ )/m.test(req.args.patch)) {
        return { ok: false, reason: 'the patch is not a unified diff.' };
      }
      return { ok: true, args: req, menuEntry: entry };
    }
    case 'config': {
      const denied = req.args.paths.filter((p) => !isPathAllowed(p, config.configPaths));
      if (denied.length > 0) {
        return {
          ok: false,
          reason: `${denied.map((d) => `"${d}"`).join(', ')} ${denied.length === 1 ? 'is' : 'are'} not among the readable config paths (${config.configPaths.join(', ') || 'none configured'}).`,
        };
      }
      return { ok: true, args: req };
    }
    case 'diff': {
      const denied = req.args.paths.filter((p) => {
        const n = normalisePath(p);
        return n === '..' || n.startsWith('../');
      });
      if (denied.length > 0)
        return { ok: false, reason: 'diff paths must stay inside the project.' };
      return { ok: true, args: req };
    }
    default:
      return { ok: true, args: req };
  }
}

export function approvalPolicyFor(config: RunnerConfig, type: EvidenceType) {
  return config.approvals[type] ?? evidenceInfo(type).defaultApproval;
}
