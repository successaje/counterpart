# Security

Counterpart exists to keep things on the reporter's machine. This page says what it defends against, what it does not, and how to report a problem.

## What is enforced

- **The runner never gives anyone a shell.** Menu entries are argv arrays run without a shell; a helpdesk picks an entry by name and cannot add arguments beyond the declared `verbose` flags.
- **Only the owner approves.** Executing evidence types wait for a decision made in the Desk or the CLI, on the owner's machine. A message in the room, from anyone, is never an approval. The MCP server's instructions say so to the agent; the runner enforces it regardless of what the agent does.
- **Anything outside the six evidence types is refused** before it reaches a collector, and the refusal is recorded verbatim.
- **Reproductions run in a sandbox with the network denied** (`sandbox-exec` on macOS, `unshare -rn` on Linux). Where no sandbox is available, E4 is refused rather than run unsandboxed.
- **Nothing leaves without redaction.** Keys, tokens, URL credentials, authorization headers, emails, IP addresses, home paths and every dotenv value are replaced before a release exists. The raw record stays on disk, in `.counterpart/evidence/`, readable only through the local API.
- **The local API binds to 127.0.0.1**, requires a per-server token (`x-counterpart-token`), and the Desk receives that token once in a URL fragment and keeps it in `localStorage` for that origin only. `server.json` is written with mode 0600.
- **Patches (E6) touch the working tree only.** Nothing is committed; the patch is in the record; `git apply -R` reverses it.

## What is not promised

- Redaction is pattern based. A secret that looks like an ordinary word gets through. Treat the "what was removed" view as a check, not a guarantee.
- A menu entry does whatever that command does. Put only checks you would run for a stranger on it.
- The sandbox denies the network. It does not hide the rest of the filesystem from a script. Keep E4 for small reproductions.
- The MCP client (your coding agent) sees the released evidence and the helpdesk's messages. Prompt injection through the room is a risk the runner limits by refusing anything outside the menu, but the agent's own behaviour is the agent's.

## Reporting a vulnerability

Email the maintainer listed in `package.json`, or open a private security advisory on GitHub ("Security" tab → "Report a vulnerability"). Please include the version, the platform, and a reproduction. You will get an acknowledgement within three days and a fix or a plan within fourteen. Do not open a public issue for something that lets evidence leave a machine unredacted or unapproved.

## Supported versions

Pre-release. Only the latest commit on `main` is supported until 1.0.
