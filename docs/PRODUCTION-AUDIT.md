# Production audit

Written 1 November 2026, before the hackathon window. The question: is Counterpart built to the standard of the best tools it will be compared with, and if not, what exactly is missing. Each gap below is tracked to a pull request; the table at the end is the running status.

## What it is compared with

Counterpart is three things at once, so it is judged against three kinds of tool.

| Counterpart is… | Compared with | What those do well |
| --- | --- | --- |
| A permission gate for an agent | Claude Code's permission prompts and modes, Cursor and Codex approvals, the HITL patterns written up in 2026 | Show the resolved action, not a summary. Allow once, allow for the session, deny. Rules layered on modes, deny before ask before allow. Prompts only for what carries risk; the rest runs. |
| A secret-aware evidence collector | gitleaks, ggshield, TruffleHog; `envinfo`, Sentry's issue detail | Named rules with ids, counts by category, output in a form a scanner or a person can read. Verification and remediation next to the finding. |
| A local developer tool with a web UI and an MCP server | Prisma Studio, Mailpit, Drizzle Studio; the GitHub and Playwright MCP servers | Keyboard-first, a palette or shortcut sheet, theme that follows the system with an override, notifications when something needs you, reconnects quietly. MCP tools carry annotations (`readOnlyHint`, `destructiveHint`, …) and descriptions with examples. |

And it is judged by the hackathon's four criteria: use of Switch, technical execution ("could someone clone the repo and reproduce it"), creativity and impact, presentation ("do the demo video and README make clear how Switch is used").

## What already meets the bar

- The approval card shows the resolved action: the exact argv, the cwd, the shell (none), the files, the script verbatim, the patch. That is the one thing the HITL literature agrees on and most agent prompts get wrong.
- Three decisions, named the way Claude Code names them: allow once, allow for this case, decline with a reason. Policy per evidence type on top (`automatic` or `ask`). Case trust is revocable.
- Redaction has named rules, counts by category, a raw-versus-released view and, since PR #10, an in-place view of what was removed. gitleaks-style ids (`aws-access-key`, `home-path`) are in the record.
- Everything is in a ledger that is one JSON file per record on the owner's disk, with a token-protected local API and server-sent events.
- Sandboxed reproductions refuse rather than degrade when no sandbox exists.
- Design system with light and dark, reduced motion, phone layouts, empty, loading and error states on every screen.
- README, architecture, product model, demo script, build log; conventional commits; every change through a reviewed pull request with green CI.

## Gaps, and what closes them

### Technical execution

| Gap | Why it matters | Closes in |
| --- | --- | --- |
| No end-to-end test: nothing proves the Desk, the server and the runner work together in a browser | "Does it run" is a judging criterion; unit tests do not show the approval round trip | PR #16, Playwright |
| No release path: nothing can be installed with `npm install -g counterpart` | The README promises it; reproducibility | PR #13, release workflow with a pack dry-run on every PR and publish on tag (needs `NPM_TOKEN`) |
| No `CHANGELOG`, `SECURITY.md`, code of conduct, issue or PR templates, Dependabot | What every top repository has; the first things a judge or contributor looks for | PR #13 |
| CLI prints prose only; scripts and agents cannot consume it | Every comparable CLI has `--json` | PR #14 |
| MCP tools carry no annotations | Clients use `readOnlyHint` and `destructiveHint` to decide when to prompt; without them a read tool may prompt and a write tool may not | PR #14 |
| Windows is not addressed | It is not supported for E4 (no sandbox) and that should be said | PR #13, README |

### Desk experience

| Gap | Why it matters | Closes in |
| --- | --- | --- |
| No keyboard path through an approval | The person deciding is a developer; Claude Code's prompt is answered with one key | PR #15: `a` allow once, `c` allow for case, `d` decline on the first card; `g` + `n/c/l/m` to navigate; `?` for the sheet |
| Nothing tells the owner a request arrived while the tab is in the background | The whole loop waits on them | PR #15: tab title badge, optional desktop notification |
| Theme follows the system with no override | Every comparable tool offers one | PR #15: system / light / dark in the sidebar, persisted |
| Pending requests expire silently | The owner should see the clock | PR #15: "expires in 9 min" on the card |
| Connection drops show "server unreachable" and wait | Mailpit and friends reconnect with backoff and say so | PR #15: backoff with a visible retry |
| Decided cards vanish; new ones pop | A settled card should leave, not disappear | PR #15: exit transition |
| No skip link | Accessibility baseline | PR #15 |

### Presentation

| Gap | Why it matters | Closes in |
| --- | --- | --- |
| Site has no social image, no canonical, no Pages 404 | Links to it look empty in Slack, Discord and X, where the hackathon is judged | PR #17 |
| README has no badges, no table of contents, no demo video section | The first screen of the README is the pitch | PR #13 |
| The Switch integration is described only in the README's Switch section | Judges read "use of Switch" first; the design should be written down before the window, the code built inside it | PR #13, `docs/SWITCH.md` |

## UI and animation choices, written down

- **One request moves; nothing else does.** The site's diagram, the approval card's path and the case timeline all draw the same route. Motion is reserved for the thing that is travelling (the dot, the current step) and for arrival (`animate-enter`, 220 ms, ease-out-quart). Decorative motion is absent on purpose.
- **Amber means waiting on you, blue means working, green means it left, red means it stayed.** The four tones carry the same meaning in every component: pills, bars, stepper dots, the card's left rule.
- **Numbers sit in mono, tabular, next to a word.** "4 of 7 left this machine", never a bare 4.
- **Bars before tables.** The Ledger and the case page open with a split bar; the list follows. A bar answers "how much left" in a glance; a table answers "which".
- **Struck text, not hidden text.** The redaction view keeps the removed text legible (it is the owner's own machine) and strikes it, so the eye reads "this became that".
- **Reduced motion is a different design, not a slower one.** The diagram jumps to its final frame; pulses stop; transitions are instant.
- **Phones get the same information, stacked.** Nothing is hidden on small screens except the diagram, which scrolls sideways because a vertical version would lie about the topology.

## Status

| Item | PR | State |
| --- | --- | --- |
| Repository hygiene, release workflow, README, `docs/SWITCH.md` | #13 | in progress |
| MCP annotations, CLI `--json` | #14 | planned |
| Desk shortcuts, notifications, theme, expiry, reconnect, exit motion, skip link | #15 | planned |
| Playwright end-to-end in CI | #16 | planned |
| Site meta, social image, footer, Pages 404 | #17 | planned |
| Switch rooms, agents, templates | window, 4–7 Nov | by rule |
| npm publish, GitHub Pages, Switch server credentials | needs the owner | simulated until then |
