# sample-app

The reporter's side of the Counterpart demo. It uses `cachekit` with the `cachekit-s3` plugin, upgraded `cachekit` from 3.1.4 to 3.2.0, and now two of three tests fail with `ENOENT … .cache/cachekit/index.json`.

What a helpdesk can ask this project's agent for is in `.counterpart/runner.yaml`: run `test` or `build`, read `.env` (values redacted), `config/*.yaml` and the vitest config, plus versions, recent changes, a sandboxed repro and a patch verified with `test`.

`docs/workaround.patch` is the fix a helpdesk would propose as an E6 `apply-fix`: pin the cache directory to the old location until the plugin is fixed.

```bash
pnpm --filter sample-app test            # 2 failed, 1 passed
cd examples/sample-app && counterpart doctor
```
