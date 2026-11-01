# Changelog

All notable changes to Counterpart. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/). Every entry links the pull request that made it.

## Unreleased

### Added

- Repository hygiene: security policy, code of conduct, issue and pull request templates, Dependabot, a release workflow that packs every public package on each pull request and publishes on a version tag, and this changelog ([#13](https://github.com/successaje/counterpart/pull/13)).
- `docs/SWITCH.md`, the design of the Switch integration that is built during the hackathon window, and `docs/PRODUCTION-AUDIT.md`, the comparison with similar tools and the list it produced ([#13](https://github.com/successaje/counterpart/pull/13)).
- Outcome bar on every case row ([#12](https://github.com/successaje/counterpart/pull/12)).
- The request's path on the approval card, with the owner's decision as the current step ([#11](https://github.com/successaje/counterpart/pull/11)).
- What was removed, shown in place: `alignRedaction` and `redactedFields` in the protocol, the in-place view in the Desk ([#10](https://github.com/successaje/counterpart/pull/10)).
- The loop drawn and animated on the site; Ledger overview and case timeline in the Desk; `StackedBar`, `BarList`, `Timeline` in the design system ([#9](https://github.com/successaje/counterpart/pull/9)).

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
