import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Where cachekit keeps its index.
 *
 * cachekit 3.2.0 moved the default directory to `.cachekit`; this constant was
 * never updated, so `restore()` fails with ENOENT on upgraded projects. That is
 * the bug the demo reproduces.
 */
const INDEX_PATH = '.cache/cachekit/index.json';

export interface CacheKitS3Options {
  bucket: string;
  /** Project root. Defaults to the current working directory. */
  root?: string;
  /** Where the fake bucket lives. Defaults to `<root>/.s3`. */
  endpoint?: string;
}

export interface RestoreResult {
  keys: number;
  from: string;
}

export class CacheKitS3 {
  readonly bucket: string;
  readonly root: string;
  readonly endpoint: string;

  constructor(options: CacheKitS3Options) {
    this.bucket = options.bucket;
    this.root = options.root ?? process.cwd();
    this.endpoint = options.endpoint ?? path.join(this.root, '.s3');
  }

  private get remoteIndex(): string {
    return path.join(this.endpoint, this.bucket, 'index.json');
  }

  /** Copies the local index to the bucket. */
  async backup(): Promise<string> {
    const local = path.join(this.root, INDEX_PATH);
    await mkdir(path.dirname(this.remoteIndex), { recursive: true });
    await copyFile(local, this.remoteIndex);
    return this.remoteIndex;
  }

  /** Reads the local index, as a cheap check that the cache is in place. */
  async restore(): Promise<RestoreResult> {
    const local = path.join(this.root, INDEX_PATH);
    const index = JSON.parse(await readFile(local, 'utf8')) as { entries: Record<string, unknown> };
    return { keys: Object.keys(index.entries).length, from: local };
  }
}
