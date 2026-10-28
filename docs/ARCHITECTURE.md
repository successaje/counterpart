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

## Approval gate

```
request ─▶ validate against menu ─▶ policy(type)
                 │ not in menu                 ├─ automatic ─▶ collect
                 ▼                             └─ ask ─▶ queue ─▶ Desk / CLI decision
              refuse + ledger                                       ├─ allow once
                                                                    ├─ allow for case
                                                                    └─ decline ─▶ ledger
```

The MCP `collect` tool blocks while a request waits, up to a configurable limit, so the agent's flow is a single call. The Desk subscribes to the queue over server-sent events.

## Sandbox

E4 `repro` runs a posted script in a fresh temp directory with network denied. The runner picks an adapter per platform: `sandbox-exec` on macOS, `unshare -n` on Linux when available. If neither works, E4 is refused with a message that says so; there is no silent fallback to an open network.

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
switch/              room templates, agent instructions, server overlay (built during the hackathon window)
docs/                this folder
```
