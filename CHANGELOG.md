# Changelog

All notable changes to Counterpart. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/). Every entry links the pull request that made it.

## Unreleased

### Added

- The Switch room, in `switch/`: `support-room.template.yaml` (the project's helpdesk and the `#<project>-support` room with the evidence-protocol and case-ledger documents) and `dev-agent.template.yaml` (the reporter's agent in the reporter's project, auto mode off, joining the room), both in Switch's template language and checked against it by a test; the two briefs; a pinned self-hosted Switch (`switch/self-host`); and `pnpm switch:sim`, the demo conversation played against the real MCP server, run in CI.
- `counterpart init` writes `.mcp.json` so a coding agent started in the project, by hand or by Switch, gets the runner; `counterpart doctor` checks it.

- Site: a generated 1200×630 social image, Open Graph and Twitter tags, a canonical URL, `robots.txt`, and footer links to the documentation ([#27](https://github.com/successaje/counterpart/pull/27)).
- Desk: keyboard shortcuts (`a`/`c`/`d` on the first waiting request, `g` then `n`/`c`/`l`/`m`, `?` for the sheet), tab title badge, opt-in desktop notifications, a system/light/dark switch, expiry on waiting cards, an exit transition for settled cards, a stream watchdog with retry, automatic landing on the Connect screen after a token rotation, a skip link ([#26](https://github.com/successaje/counterpart/pull/26)).
- Playwright end-to-end tests for the Desk against the seeded runner, desktop and phone, run in CI ([#26](https://github.com/successaje/counterpart/pull/26)).
- MCP tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) on all nine tools; `--json` on `info`, `approvals`, `cases`, `case`, `approve` and `decline`; `--no-color` ([#15](https://github.com/successaje/counterpart/pull/15)).

- Repository hygiene: security policy, code of conduct, issue and pull request templates, Dependabot, a release workflow that packs every public package on each pull request and publishes on a version tag, and this changelog ([#13](https://github.com/successaje/counterpart/pull/13)).
- `docs/SWITCH.md`, the design of the Switch integration that is built during the hackathon window, and `docs/PRODUCTION-AUDIT.md`, the comparison with similar tools and the list it produced ([#13](https://github.com/successaje/counterpart/pull/13)).
- Outcome bar on every case row ([#12](https://github.com/successaje/counterpart/pull/12)).
- The request's path on the approval card, with the owner's decision as the current step ([#11](https://github.com/successaje/counterpart/pull/11)).
- What was removed, shown in place: `alignRedaction` and `redactedFields` in the protocol, the in-place view in the Desk ([#10](https://github.com/successaje/counterpart/pull/10)).
- The loop drawn and animated on the site; Ledger overview and case timeline in the Desk; `StackedBar`, `BarList`, `Timeline` in the design system ([#9](https://github.com/successaje/counterpart/pull/9)).

### Fixed

- Redaction: the per-user hash in a macOS temp path (`/var/folders/xx/<hash>/T/…`) now leaves as `«redacted:user»`, like a home directory. Found by the room simulation.
- `counterpart desk` hung on Ctrl-C while a Desk tab was open: closing the server waited for the event stream. It now drops every connection and exits at once ([#26](https://github.com/successaje/counterpart/pull/26)).

## 0.1.0 · 2026-10-28

First working version, built in eight pull requests.

### Added

- Protocol: six evidence types with argument schemas, the `runner.yaml` schema, request, record and release schemas, the case state machine, the redaction engine and evidence cards ([#1](https://github.com/successaje/counterpart/pull/1)).
- Runner: project detection, the ledger, six collectors, the network-denied sandbox, the approval gate, the local API with server-sent events and the one-server connection model ([#2](https://github.com/successaje/counterpart/pull/2)).
- CLI and MCP server: `init`, `doctor`, `desk`, `mcp`, `info`, `approvals`, `approve`, `decline`, `watch`, `cases`, `case`, `card`; nine MCP tools with rules of engagement ([#3](https://github.com/successaje/counterpart/pull/3)).
- Design system: theme tokens in light and dark, thirteen components ([#4](https://github.com/successaje/counterpart/pull/4)).
- The Desk: Now, Cases, Case, Ledger, Menu, Connect and record screens, served by the CLI ([#5](https://github.com/successaje/counterpart/pull/5)).
- Example projects with a real dependency bug ([#6](https://github.com/successaje/counterpart/pull/6)).
- The public site with a live demo of one request ([#7](https://github.com/successaje/counterpart/pull/7)).
- README, contributing guide, demo script, architecture ([#8](https://github.com/successaje/counterpart/pull/8)).
