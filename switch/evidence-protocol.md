# The evidence protocol

A reporter's agent runs on the reporter's machine with the Counterpart runner. A helpdesk may ask it for six kinds of evidence, by code and name, and for nothing else. Every executing type waits for the reporter's approval in their Desk; every release is redacted on the reporter's machine before it reaches this room.

| Code | Name | What the helpdesk gets | What never leaves |
| --- | --- | --- | --- |
| E1 | versions | Platform, runtime, package manager, installed versions of the named packages | Nothing to redact; released automatically |
| E2 | config | The readable config files the reporter listed, by path | Dotenv values, keys, tokens, home directories, usernames |
| E3 | command | The output of one named menu entry, with the verbose flag if asked | Secrets, emails, paths and custom literals in the output |
| E4 | repro | The output of a posted script, run in a sandbox with no network | The same; the sandbox hides the network, not the filesystem |
| E5 | diff | `git diff --stat` and recent commits for the named paths | Secrets and paths in commit subjects |
| E6 | apply-fix | Whether a posted patch applied, and the output of the named verification | The same as E3; nothing is committed |

Two rules every helpdesk follows:

1. **Ask by name.** Name the type, the menu entry, the paths or the packages. The agent's menu is the whole list of what can run; ask for its menu first.
2. **Never ask for anything else.** Not a file, not a credential, not a command that is not on the menu, not a "quick" exception. A request outside the menu is refused and recorded verbatim in the reporter's ledger.

A refusal or a decline is final. Ask for a different evidence type, or stop.
