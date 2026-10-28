# Examples

Three small packages that reproduce a real kind of dependency bug, used by the demo and by anyone trying Counterpart end to end.

| Package | Role | What is wrong |
| --- | --- | --- |
| `cachekit` 3.2.0 | the library | 3.2.0 moved its default directory from `.cache/cachekit` to `.cachekit` |
| `cachekit-s3` 0.4.1 | a plugin | still reads the index from the old, hard-coded path |
| `sample-app` | the reporter's app | upgraded `cachekit`; two tests now fail with `ENOENT` |

`sample-app` carries a `.counterpart/runner.yaml` so a helpdesk can ask its agent for E1…E6, a `.env` with obviously fake values that must never leave the machine, and a `config/cache.yaml` that mentions a home directory.

The library's `CHANGELOG.md` explains the move. A helpdesk agent with the `cachekit` checkout can diagnose the plugin from the evidence the reporter releases and propose the workaround in `sample-app/docs/workaround.patch` as an E6 `apply-fix`, then file the real bug against the plugin.

Run the failing suite yourself:

```bash
pnpm --filter sample-app test
```
