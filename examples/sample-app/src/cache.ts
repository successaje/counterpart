import { type Cache, createCache } from 'cachekit';
import { CacheKitS3 } from 'cachekit-s3';

export interface AppCache {
  cache: Cache;
  s3: CacheKitS3;
}

/**
 * The app's cache: a local cachekit store, backed up to the team bucket.
 * After the cachekit 3.2.0 upgrade the plugin no longer finds the index.
 */
export function setupCache(root: string): AppCache {
  const cache = createCache({ root, ttlMs: 60_000 });
  const s3 = new CacheKitS3({ bucket: process.env.S3_BUCKET ?? 'local-dev-cache', root });
  return { cache, s3 };
}

export async function warm(cache: Cache): Promise<void> {
  await cache.set('pricing:plans', [
    { id: 'free', seats: 1 },
    { id: 'team', seats: 10 },
  ]);
  await cache.set('feature-flags', { newCheckout: true });
}
