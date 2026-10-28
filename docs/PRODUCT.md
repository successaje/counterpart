# Counterpart: product model

This document is the north star for the build. Implementation may improve on it; it should not drift from it silently.

## Thesis

A bug in a dependency needs two things that live in two places. The evidence is on the reporter's machine: versions, config, the failing command, the recent diff. The knowledge is in the project: what changed in 3.2.0, which plugin hard-codes a path, what the fix is. Today a human carries the evidence by hand into an issue tracker, usually incompletely, and a maintainer spends their first reply asking for more.

Counterpart puts the reporter's coding agent and the project's helpdesk agent in one shared room. The project's agent asks for evidence by name. The reporter's agent collects it on the reporter's machine, under the reporter's approval, with secrets redacted before anything leaves. The project's agent reproduces the failure, proposes a fix, and only then files an issue or asks a maintainer for time.

Nobody hands their laptop to someone else's agent. Nobody pages a maintainer for a bug that was never reproduced.

## Core user

**Primary: the reporter.** A developer whose app broke after a dependency change. They already use a coding agent. They want the bug gone, and they do not want to paste their `.env` into a GitHub issue by accident.

**Secondary: the maintainer.** A person who runs a project's helpdesk agent so that human attention is spent only on reproduced problems.

## Core action

Get a dependency bug reproduced and fixed without hand-assembling a bug report, and without anything leaving the machine that the reporter did not approve.

## Product loop

Every dependency failure is a case. Every case leaves a ledger: what was asked, what was shared, what was redacted, who approved it, what fixed it. The ledger is why the reporter comes back: it is the record they would otherwise reconstruct from a chat scrollback. Maintainers come back because the room only ever brings them reproduced issues.

## The magical interaction

The project's agent asks for exactly the right evidence by name. The Desk shows the approval card with "what will leave your machine" already redacted, next to what stays. You click Allow. A minute later the project's agent posts a diagnosis and a one-line fix. Your agent applies it under approval and confirms the failing command now passes. No maintainer was paged.

## Why Switch

Switch is the only shipped layer where agents owned by different people run on their owners' own machines and address each other in one channel, with permission cards and a record of who decided what. Without Switch there is no shared room, no cross-owner addressing and no approval trail; Counterpart would collapse into a single-vendor bot that one side runs on the other's behalf.

## Vocabulary

| Term | Meaning |
| --- | --- |
| Case | One dependency failure, from first report to closure. |
| Request | The project agent asking for one named evidence type. |
| Menu | The allowlisted commands the runner may execute in this project. |
| Release | An evidence record after redaction, the version that may leave the machine. |
| Ledger | The complete local history of requests, approvals, releases and refusals. |
| Desk | The local web app where the reporter approves requests and reads the ledger. |
| Helpdesk | The project side's agent. |

## Evidence types

| Id | Name | Executes code? | Default approval |
| --- | --- | --- | --- |
| E1 | `versions` | no | automatic |
| E2 | `config` | no | ask |
| E3 | `command` | yes, one menu item | ask |
| E4 | `repro` | yes, a posted script, in a temp dir with network denied | ask |
| E5 | `diff` | no | automatic |
| E6 | `apply-fix` | yes, applies a patch then re-runs E3 | ask |

Anything outside this menu is refused in one line that quotes the request. Refusals are recorded in the ledger.

## Essential flows

1. **First visit.** The public site explains the idea in one screen and shows a real case.
2. **Install.** `npm i -g counterpart` then `counterpart init` inside a project. Init detects the package manager and test commands, writes `.counterpart/runner.yaml` with a proposed menu and the default redaction rules, and prints what it will and will not do.
3. **Connect the agent.** `counterpart mcp` is registered with the coding agent. `counterpart desk` starts the local server and opens the Desk.
4. **A case begins.** The agent opens a case when the room's helpdesk starts asking. The Desk shows it immediately.
5. **A request arrives.** The Desk shows who asked, for what, and the exact command or paths involved.
6. **Approval.** The reporter allows once, allows for this case, or declines. Automatic types pass without a click but still appear in the ledger.
7. **Collection.** Staged state: Collecting → Redacting → Released. Timeouts and truncation are visible, not silent.
8. **Result.** The release shows side by side what left and what was redacted, with counts by category.
9. **History.** Cases and releases persist across restarts and are searchable.
10. **Error recovery.** Sandbox unavailable, command timed out, patch does not apply, agent disconnected: each has a specific message and a next step.
11. **Returning user.** The Desk opens on open cases, then recent ledger entries. Trusted-for-case approvals are shown and revocable.

## What this is not

- Not a bug tracker. Cases close into the project's tracker.
- Not a sandbox product. The runner reduces risk with an allowlist, a timeout, truncation and redaction; it is honest about what it cannot guarantee.
- Not a helpdesk bot you run for the reporter. The reporter's agent is theirs and runs on their machine.
