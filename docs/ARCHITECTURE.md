# Architecture

## Shape

```
 reporter's machine                      Switch room                  project's machine
 ──────────────────                      ───────────                  ─────────────────
 coding agent  ──MCP──▶ runner           dev-agent ◀──────▶ helpdesk  ◀── coding agent
                        ├─ menu (yaml)      │   evidence cards   │          ├─ library checkout
                        ├─ approval gate    │   permission cards │          ├─ repro sandbox
                        ├─ sandbox          │                    │          └─ gh (issues)
                        ├─ redactor         │
                        └─ ledger ──▶ Desk (localhost)
```

Counterpart is three layers.

1. **Protocol** (`packages/protocol`). Pure TypeScript, no I/O. Defines evidence types, requests, records, releases, case states and transitions, the redaction engine and the evidence card format. Both sides of a case speak this.
2. **Runner** (`packages/runner`). Runs on the reporter's machine. Loads `.counterpart/runner.yaml`, holds the approval queue, executes collectors, redacts, writes the ledger and serves a local HTTP API. Everything that touches the file system or spawns a process lives here.
3. **Surfaces.** The CLI and MCP server (`packages/cli`) expose the runner to the reporter's agent and terminal. The Desk (`apps/desk`) is the browser surface for approvals and the ledger. The site (`apps/web`) is public.

## Invariants

- No evidence leaves the runner un-redacted. The MCP tool returns releases, never raw records.
- No executing evidence type runs without an approval decision recorded in the ledger. Automatic approval is a per-type configuration, not a code path that skips the ledger.
- Approval is decided on the reporter's machine (Desk or terminal), never by a message in the room. The room's permission cards are a second layer, not the gate.
- Every request outside the menu is refused and the refusal is recorded with the request text.
- The protocol package never imports Node built-ins. It must run in the browser.

## Data

The runner keeps state under `.counterpart/` in the project:

```
.counterpart/
  runner.yaml          committed: menu, redaction rules, approval defaults
  state/               ignored: cases.json, approvals.json
  evidence/            ignored: one JSON file per record, raw and released
```

Records are immutable once written. A case is a small document with a state and a list of record ids.

## One server per project

Whichever process starts first owns the ledger: the MCP server under a coding agent, or `counterpart desk`. It binds to 127.0.0.1 on port 4747 (or a free one), generates a token, and writes `.counterpart/state/server.json` (mode 0600) with the port, token and pid. Later processes read that file, check `/api/health`, and talk over HTTP; the CLI's `approve`, `watch` and `cases` commands are thin clients. The Desk receives the token once in the URL fragment (`#token=…`), keeps it in localStorage for the origin, and strips it from the address bar. EventSource cannot set headers, so `/api/events` accepts the token as a query parameter. When the server stops it removes the record; a stale record is cleaned up by the next `connect`.

```
coding agent ──stdio──▶ counterpart mcp ──┐
                                          ├── Runner (ledger, gate, collectors) ── HTTP 127.0.0.1:4747 ──▶ Desk
counterpart desk / approve / watch ───────┘        ▲
                                                   └── second process: RemoteRunner over HTTP
```

## Approval gate

```
request ─▶ validate against menu ─▶ policy(type)
                 │ not in menu                 ├─ automatic ─▶ collect
                 ▼                             └─ ask ─▶ queue ─▶ Desk / CLI decision
              refuse + ledger                                       ├─ allow once
                                                                    ├─ allow for case
                                                                    └─ decline ─▶ ledger
```

The MCP `collect` tool waits up to `wait_seconds` (default 60) and then returns `pending` with the record id; `await` continues. Decisions arriving from any surface wake every waiter. Pending records expire after `limits.approvalWaitMs`, and records left `pending` or `collecting` by a previous process are closed as expired or failed on startup. The Desk subscribes over server-sent events.

## Sandbox

E4 `repro` runs a posted script in a fresh temp directory with network denied and the environment reduced to PATH and locale. The runner probes an adapter per platform at startup: `sandbox-exec -p '(version 1)(allow default)(deny network*)'` on macOS, `unshare -rn` on Linux. If neither works, E4 is refused before approval with a message that says so; there is no silent fallback to an open network. The sandbox does not hide the filesystem.

## E6 and git

`apply-fix` writes the patch to a temp file and runs `git apply --check --recount`, then `git apply`, from the repository toplevel with `--directory=<project path>` so project-relative patches work in monorepos (inside a subdirectory, git apply would resolve paths against the root and silently ignore the rest). Nothing is committed; the patch is in the record and reverses with `git apply -R`. Then the named menu entry runs as E3 would.

## Case states

```
reported ─▶ evidence-requested ─▶ evidence-collected ─▶ diagnosed ─▶ fix-proposed ─▶ fix-verified ─▶ resolved
                                                                                  └─▶ filed
   any state ─▶ needs-human
```

Transitions are validated in the protocol package; the runner records who moved the case and why.

## Repository layout

```
packages/protocol    @counterpart/protocol
packages/runner      @counterpart/runner
packages/cli         counterpart (bin)
packages/ui          @counterpart/ui   design system shared by desk and web
apps/desk            local web app, built into the cli package
apps/web             public site
examples/            sample projects used in the demo
scripts/             desk-dev-server.mjs: a seeded runner for Desk development
switch/              room templates, agent instructions, server overlay (built during the hackathon window)
docs/                this folder
```
