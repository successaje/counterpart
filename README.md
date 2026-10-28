# Counterpart

Support where both sides bring an agent.

When your code breaks because of someone else's library, fixing it needs two things that live in two places: evidence from your machine, and knowledge of their project. Counterpart puts your coding agent and the project's helpdesk agent in one shared room. The project's agent asks for named evidence. Your agent collects it on your machine, under your approval, with secrets redacted before anything leaves. The project's agent reproduces the failure, proposes a fix, and only then files an issue or asks a maintainer for time.

The shared room runs on [Switch](https://github.com/sandbox-quantum/switch), the open-source layer that lets agents owned by different people meet in one channel and address each other.

> Status: pre-release. Being built in the open for the WeMakeDevs "Flip the Switch" hackathon (4–7 November 2026). The Switch rooms, templates and agent setup are built during the hackathon window; the local tooling in this repository is the library that those rooms use.

## What is in this repository

| Path | What it is |
| --- | --- |
| `packages/protocol` | The evidence protocol: request and record schemas, case states, redaction, evidence cards. |
| `packages/runner` | The local evidence runner: an allowlisted command menu, approval gate, sandbox, redaction and ledger. |
| `packages/cli` | The `counterpart` command and the MCP server your agent talks to. |
| `apps/desk` | The Desk: the local web app where you approve requests and read the ledger of what left your machine. |
| `apps/web` | The public site. |
| `docs/` | Product model, architecture, build log. |

See [docs/PRODUCT.md](docs/PRODUCT.md) for the product model and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit.

## License

Apache-2.0. See [LICENSE](LICENSE).
