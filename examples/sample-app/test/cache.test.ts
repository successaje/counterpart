import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setupCache, warm } from '../src/cache.js';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'sample-app-'));
});
afterEach(async () => rm(root, { recursive: true, force: true }));

describe('app cache', () => {
  it('warms the cache', async () => {
    const { cache } = setupCache(root);
    await warm(cache);
    expect(await cache.get('feature-flags')).toEqual({ newCheckout: true });
  });

  it('restores from s3', async () => {
    const { cache, s3 } = setupCache(root);
    await warm(cache);
    const result = await s3.restore();
    expect(result.keys).toBe(2);
  });

  it('evicts expired entries', async () => {
    const { cache, s3 } = setupCache(root);
    await warm(cache);
    await s3.restore();
    const removed = await cache.evictExpired(Date.now() + 120_000);
    expect(removed).toBe(2);
  });
});
