import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';

export const COUNTERPART_DIR = '.counterpart';
export const CONFIG_FILE = 'runner.yaml';

export interface CounterpartPaths {
  root: string;
  dir: string;
  config: string;
  state: string;
  cases: string;
  evidence: string;
  server: string;
}

export function pathsFor(root: string): CounterpartPaths {
  const dir = path.join(root, COUNTERPART_DIR);
  const state = path.join(dir, 'state');
  return {
    root,
    dir,
    config: path.join(dir, CONFIG_FILE),
    state,
    cases: path.join(state, 'cases'),
    evidence: path.join(dir, 'evidence'),
    server: path.join(state, 'server.json'),
  };
}

export async function exists(p: string): Promise<boolean> {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Walks up from `start` to find the nearest `.counterpart/runner.yaml`.
 */
export async function findProjectRoot(start: string): Promise<string | null> {
  let current = path.resolve(start);
  for (;;) {
    if (await exists(path.join(current, COUNTERPART_DIR, CONFIG_FILE))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/** True when `target` is inside `root` (or equal to it). */
export function isInside(root: string, target: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}
