# cachekit

A small file-backed cache with TTLs. Values are JSON files under a directory; `index.json` maps keys to files and expiry times.

```ts
import { createCache } from 'cachekit';

const cache = createCache({ ttlMs: 60_000 });
await cache.set('user:1', { name: 'Ada' });
await cache.get('user:1');
```

Since 3.2.0 the default directory is `.cachekit`. See the changelog.
