# cachekit-s3

Backs up a `cachekit` index to a bucket and restores it on a fresh machine. The bucket in this example is a directory, so nothing touches the network.

```ts
import { CacheKitS3 } from 'cachekit-s3';

const s3 = new CacheKitS3({ bucket: 'team-cache' });
await s3.backup();
await s3.restore();
```

Tested against cachekit 3.1.x.
