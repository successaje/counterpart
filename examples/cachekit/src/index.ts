import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Default directory since 3.2.0. Earlier releases used `.cache/cachekit`. */
export const DEFAULT_DIR = '.cachekit';
export const LEGACY_DIR = '.cache/cachekit';
export const INDEX_FILE = 'index.json';

export interface CacheOptions {
  /** Directory for the cache, relative to `root`. Defaults to `CACHEKIT_DIR` or `.cachekit`. */
  dir?: string;
  /** Project root. Defaults to the current working directory. */
  root?: string;
  /** Time to live for entries. Defaults to one hour. */
  ttlMs?: number;
}

export interface IndexEntry {
  file: string;
  expiresAt: number;
}

export interface Index {
  version: 2;
  entries: Record<string, IndexEntry>;
}

export class Cache {
  readonly root: string;
  readonly dir: string;
  readonly indexPath: string;
  readonly ttlMs: number;

  constructor(options: CacheOptions = {}) {
    this.root = options.root ?? process.cwd();
    this.dir = path.resolve(this.root, options.dir ?? process.env.CACHEKIT_DIR ?? DEFAULT_DIR);
    this.indexPath = path.join(this.dir, INDEX_FILE);
    this.ttlMs = options.ttlMs ?? 60 * 60 * 1000;
  }

  private async readIndex(): Promise<Index> {
    try {
      return JSON.parse(await readFile(this.indexPath, 'utf8')) as Index;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { version: 2, entries: {} };
      throw err;
    }
  }

  private async writeIndex(index: Index): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.indexPath, JSON.stringify(index, null, 2));
  }

  async set<T>(key: string, value: T): Promise<void> {
    const index = await this.readIndex();
    const file = `${createHash('sha1').update(key).digest('hex')}.json`;
    await mkdir(this.dir, { recursive: true });
    await writeFile(path.join(this.dir, file), JSON.stringify(value));
    index.entries[key] = { file, expiresAt: Date.now() + this.ttlMs };
    await this.writeIndex(index);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const index = await this.readIndex();
    const entry = index.entries[key];
    if (!entry || entry.expiresAt < Date.now()) return undefined;
    return JSON.parse(await readFile(path.join(this.dir, entry.file), 'utf8')) as T;
  }

  async index(): Promise<Index> {
    return this.readIndex();
  }

  /** Removes expired entries and their files. Returns how many went. */
  async evictExpired(now = Date.now()): Promise<number> {
    const index = await this.readIndex();
    let removed = 0;
    for (const [key, entry] of Object.entries(index.entries)) {
      if (entry.expiresAt < now) {
        await rm(path.join(this.dir, entry.file), { force: true });
        delete index.entries[key];
        removed++;
      }
    }
    await this.writeIndex(index);
    return removed;
  }
}

export function createCache(options?: CacheOptions): Cache {
  return new Cache(options);
}
