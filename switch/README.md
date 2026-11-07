# The Switch room

Counterpart's room is a [Switch](https://github.com/sandbox-quantum/switch) room with two agents owned by two people. This folder is everything that makes one: the two templates, the two briefs, the room documents, a self-hosted server to run it on, and a simulation of the conversation that runs in CI. The design it follows is [docs/SWITCH.md](../docs/SWITCH.md); the demo it is for is [docs/DEMO.md](../docs/DEMO.md).

| File | What it is | Who uses it |
| --- | --- | --- |
| [support-room.template.yaml](support-room.template.yaml) | Creates the project's helpdesk agent and the `#<project>-support` room with its two documents, in one run | A maintainer, once per project |
| [dev-agent.template.yaml](dev-agent.template.yaml) | Creates the reporter's agent in the reporter's project and adds it to the support room | A reporter, once per project they report from |
| [helpdesk.md](helpdesk.md) | The helpdesk's brief (the template carries it word for word) | Pasted by hand when registering without the template |
| [dev-agent.md](dev-agent.md) | The reporter agent's brief, the MCP server's rules of engagement restated for the room | Same |
| [evidence-protocol.md](evidence-protocol.md), [case-ledger.md](case-ledger.md) | The two room documents | Attached by the template |
| [self-host/](self-host/) | A pinned, self-hosted Switch with the bundled Mattermost | Whoever runs the server |
| [sim/room.mjs](sim/room.mjs) | The demo conversation against the real MCP server, with checks | CI, and `pnpm switch:sim` |

Both templates are Switch's template language, version 1 ([the reference](https://github.com/sandbox-quantum/switch/blob/main/docs/TEMPLATES.md)). A test in `packages/cli/test/switch.test.ts` checks them against that language and keeps the briefs, the documents and the MCP server's tool names in step.

## How it maps to Switch

| Counterpart needs | Switch gives | Where |
| --- | --- | --- |
| Two agents owned by two people, each running on its owner's machine | An agent runs where its owner runs it ("This computer") and inherits its owner's permissions | Both templates: `location: local`, each run by its owner |
| The helpdesk may *ask* the reporter's agent; nobody in the room may *instruct* it | Addressing policies, set by each agent's owner: a new agent admits only `owner` and `owner_agents` | `dev-agent.template.yaml`: `addressing: owner-agents`, then the owner adds the helpdesk under Custom rules |
| Any reporter may bring a case | `addressing: anyone` on the helpdesk | `support-room.template.yaml` |
| A second gate on the reporter's side | Auto mode off: every tool call posts a permission request the owner answers; Switch records who answered | `dev-agent.template.yaml`: `auto_mode: false` |
| A shared, reproducible room with a written protocol | Room templates with typed params, room documents, a kickoff | `support-room.template.yaml`: `room.docs`, `kickoff` |
| The reporter's agent gets the runner | A coding agent started in a folder reads that folder's `.mcp.json` | `counterpart init` writes it; `directory: "{project_dir}"` |

## The server

Any Switch server works: a workspace you already have, or the one in [self-host/](self-host/):

```bash
cd switch/self-host
./up.sh        # .env with fresh secrets, the compose file for the pinned version, the stack, a health wait
```

It prints the API address for Switch Console (**Add a server**, **Connect to an existing server**, `http://localhost:8000`), the Gateway sign-in (`http://localhost:3000`), and the bundled Mattermost sign-in (`http://localhost:8065`). The messaging app is Mattermost by default; to use Discord instead, connect a bot under **Messaging apps** in Switch Console ([Switch's Discord page](https://docs.switchagents.ai/switch-rooms/deploy/messaging-apps/discord) lists the intents and permissions) and the room template picks it up by name.

`./down.sh` stops the stack and keeps the data; `./down.sh --wipe` removes it. `./validate.sh ../support-room.template.yaml ../dev-agent.template.yaml` asks the server for its verdict on a template, the same check Switch Console runs as you type; `SWITCH_API=https://switch.example.com` points it at another server.

## Project side (a maintainer)

1. In Switch Console, **Templates**, **Import template**: `support-room.template.yaml`.
2. **Use** it. The form asks for the project slug (`cachekit`), the repository the helpdesk clones (`https://github.com/successaje/counterpart`), the library's path inside it (`examples/cachekit`), the GitHub repository issues are filed against, and the messaging app. The Advanced fold holds the provider (the first coding agent installed), the machine (this computer) and the directory.
3. **Create agent and room.** Switch Console creates `cachekit-helpdesk` on this computer, clones the repository into its directory, creates `#cachekit-support` with the evidence protocol and the case ledger attached, and posts the kickoff. The helpdesk introduces itself and posts the six evidence types.
4. For issues: `gh auth login` on this machine, so the helpdesk can file. Without it, it posts the issue body in the room.

## Reporter side

1. In your project: `counterpart init` (writes `.counterpart/runner.yaml` and `.mcp.json`), `counterpart doctor`, then `counterpart desk` and keep it open.
2. In Switch Console, **Templates**, **Import template**: `dev-agent.template.yaml`. **Use** it: your project folder, the support room (`cachekit-support`), and the agent's name (`dev-agent` unless you run several). **Create agent.** The agent is created on this computer, in your project, and added to the room.
3. Open the agent's page, **Who can talk to your agent**, **Custom rules**: add the project's helpdesk agent (`cachekit-helpdesk`), scoped to the support room. That is the whole addressing policy: you, your own agents, and that one helpdesk. Nobody else in the room can make it act.
4. In the room: `@dev-agent open a case with the cachekit helpdesk about this: two tests fail with ENOENT after I upgraded cachekit to 3.2.0.`

From there the conversation is the one in [docs/DEMO.md](../docs/DEMO.md): the helpdesk asks for E1 and E3 by name, E3 stops in your Desk, you allow it once, the release lands in the room redacted, the helpdesk reproduces and proposes E6, the hostile request is refused in one line and recorded.

## The conversation, simulated

```bash
pnpm build && pnpm switch:sim
```

The simulation plays the same conversation against the real `counterpart mcp` server in `examples/sample-app`, with a scripted helpdesk and the owner deciding through the CLI, the way the Desk decides. It prints the room as a transcript and checks what the Switch room would show: E1 leaves on its own, E3 waits for the owner and comes back with redaction tokens and no secret, E6 applies and verifies, the hostile request is refused and recorded verbatim, the card is drawn from releases only, and the ledger counts match. It runs in CI on every pull request ("Support room, simulated").

What it does not cover is Switch's own layer, addressing and permission prompts, which is why the room exists; the two templates above are how that is stood up, and `docs/SWITCH.md` says what was checked against Switch's documentation.

## Registering by hand

Without the templates, in Switch Console, **Your Agents**, **Add agent**:

- **Helpdesk**: name `cachekit-helpdesk`, directory the library checkout, provider Claude Code, Auto mode on, **Who can talk to your agent**: Anyone. Paste [helpdesk.md](helpdesk.md) into Agent instructions, replacing `{project}`, `{library_path}` and `{issues_repo}`. Create `#cachekit-support`, add the helpdesk, and ask it to add [evidence-protocol.md](evidence-protocol.md) and [case-ledger.md](case-ledger.md) as room documents.
- **dev-agent**: name `dev-agent`, directory your project, provider Claude Code, Auto mode off, **Who can talk to your agent**: Custom rules with the helpdesk in the support room. Paste [dev-agent.md](dev-agent.md) into Agent instructions. **Add to room**: the support room.
