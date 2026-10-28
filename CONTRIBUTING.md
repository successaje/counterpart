# Contributing

## Setup

```bash
pnpm install
pnpm build
pnpm check
```

Node 20.11 or newer and pnpm 10. Packages consume each other's built declarations, so build before typecheck or test on a cold checkout.

## Layout and rules

- `packages/protocol` has no Node imports and must keep working in the browser. `tsconfig` sets `types: []` so a Node import fails to compile.
- The runner is the only place that touches the file system or spawns processes.
- Releases never carry `raw`. If you add a field to a record, decide whether it may leave the machine.
- Anything a helpdesk can ask for goes through `validateRequest` first, then the approval gate, then a collector. Do not add a path that skips the ledger.
- User-facing sentences about records (`describeApproval`, `releaseHeadline`, …) live in the protocol package so the CLI, the MCP server and the Desk say the same thing.

## Branches and pull requests

`main` stays green. Work on `feat/…`, `fix/…`, `docs/…` branches and open a pull request that says what changed, why, what the user feels, anything architectural, and how it was tested. Commits are conventional (`feat(runner): …`, `fix(desk): …`, `docs: …`) and each one should build.

## Style

Biome formats and lints (`pnpm lint:fix`). Two spaces, single quotes, 100 columns. Markdown is excluded from formatting.

## Tests

`pnpm test` runs vitest across packages and apps. The runner tests create throwaway git repositories under the OS temp directory and need `git` on PATH; the E4 test needs `sandbox-exec` (macOS) or `unshare` (Linux) to assert the network is denied, and otherwise asserts the refusal.
