# Build log

Milestones, newest last. Dates are in IST.

| Date | Milestone |
| --- | --- |
| 2026-10-28 | Repository initialized. Product model and architecture written. |
| 2026-10-28 | Protocol package: evidence types, config schema, records and releases, case state machine, redaction engine, evidence cards. 31 tests. (PR #1) |
| 2026-10-28 | Runner: config loading and detection, ledger, six collectors with sandbox, approval gate, local API with SSE, single-server connect. (PR #2) |
| 2026-10-28 | CLI and MCP server: init, doctor, desk, mcp, approvals, watch, cases, card; nine MCP tools with rules of engagement. (PR #3) |
| 2026-10-28 | Design system: theme tokens (light and dark), thirteen components. (PR #4) |
| 2026-10-28 | The Desk: Now, Cases, Case, Ledger, Menu, Connect, record side-by-side; served by the CLI. Verified in the browser at desktop and phone widths. (PR #5) |
| 2026-10-28 | Example projects: cachekit 3.2.0, cachekit-s3 with the path bug, sample-app with runner.yaml. Runner fix for E6 in monorepos. (PR #6) |
| 2026-10-28 | Public site with a live demo of one request; GitHub Pages workflow. (PR #7) |
| 2026-10-28 | README, contributing guide, demo script, architecture update. (PR #8) |
| 2026-10-28 | Visualisation: the loop drawn and animated on the site; Ledger overview (outcomes, redactions, evidence types) and case timeline in the Desk; StackedBar, BarList and Timeline in the design system. (PR #9) |
| 2026-10-30 | Redaction shown in place: alignRedaction and redactedFields in the protocol; the Desk's compare view strikes through what stayed and shows the token that replaced it. (PR #10) |
| 2026-10-30 | The approval card shows the request's path from the room to the agent, with the owner's decision as the current step. (PR #11) |
| 2026-11-01 | Every case row carries its outcome bar: what left, what stayed, what is waiting. (PR #12) |
| 2026-11-01 | Production audit against comparable tools; repository hygiene, release workflow with a pack-and-install check in CI, changelog, Switch integration design. (PR #13) |
| 2026-11-01 | MCP tool annotations; CLI --json and --no-color. (PR #15) |
| 2026-11-01 | Desk: shortcuts, notifications, theme, expiry, exit motion, stream watchdog and token-rotation recovery; Playwright end-to-end in CI; runner shutdown fix. (PR #26) |
| 2026-11-01 | Site: social image, meta tags, documentation links. (PR #27) |
| 2026-11-01 | Dependabot's seven green bumps merged; the four majors closed by config. |
| 2026-11-07 | The Switch integration, inside the window: `switch/` with the support-room and dev-agent templates in Switch's template language, both briefs, the evidence-protocol and case-ledger room documents, a pinned self-host overlay, `counterpart init` writing `.mcp.json`, and the support room simulated against the real MCP server in CI. The simulation found a redaction gap (macOS per-user temp paths), fixed in the protocol. |
