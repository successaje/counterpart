# cachekit changelog

## 3.2.0

- **Default directory moved.** The cache now lives in `.cachekit` at the project root instead of `.cache/cachekit`. Set `dir` explicitly or `CACHEKIT_DIR` to keep the old location. (#212)
- `evictExpired()` returns the number of entries removed.

## 3.1.4

- Fix index corruption when two writers raced on `set`.

## 3.1.0

- Add `ttlMs` option.
