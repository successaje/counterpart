# Submission answers

The answers for the Flip the Switch submission form, field by field, ready to paste. Items in `[square brackets]` are links to fill in. The form's own rules are quoted where they matter.

## Part 1 of 3

### Project title

Counterpart: support where both sides bring an agent

### Tracks you are submitting for

The field offers three: Best Business Workflow, Best Personal or Creative Workflow, Best Core Contribution. Tick one:

- Best Business Workflow

Counterpart is a support workflow between a project and its users, which is Track 1's brief. It is not a personal or creative project, and there is no pull request to Switch's core, so the other two would only dilute it. Best Blog is a side track; it is entered through the blog-post field in Track Details, not here.

### Project description

Every maintainer knows the first reply to a dependency bug. *What versions are you on?* And every reporter knows the pause before pasting a stack trace into a public issue, scrubbing a home directory out of it, wondering what else is in that config file. That exchange costs real teams a day per bug, and it costs people something harder to name: the feeling that helping and being helped both require handing over more than you wanted to.

Counterpart is support where both sides bring an agent, and neither hands over their machine.

The project's helpdesk is an agent in a Switch room. It knows the project, it knows what changed in the last release, and it can ask for exactly six kinds of evidence by code: versions, config, a named command, a reproduction in a sandbox with no network, the recent diff, and a patch to try. The reporter's agent runs on the reporter's own laptop, inside their own project. It answers only its owner and that one helpdesk. Every request that would execute something stops at the Desk, a page on localhost, where the reporter sees who asked, their exact words, and the exact command that will run. They allow it once, allow it for the case, or decline. The output is redacted on their machine before it leaves. The Desk shows what was removed, in place, so you can read the sentence that left and the sentence that stayed.

Anything outside the menu is refused, recorded word for word, and never run. In the demo the helpdesk asks for `~/.aws/credentials`. The reporter's agent says no, quotes the request, and points at the menu. The rule held because it was written down, not because anyone was watching.

It is for the people on both sides of a bug report: the maintainer of a library who wants complete evidence without asking three times, and the developer who hit the bug and wants to help without pasting their life into an issue. Nothing leaves without you.

### GitHub repository

https://github.com/successaje/counterpart

> Public, as the form requires. The README explains setup from a clean clone, and CI runs the full check on every push.

### Demo video

[YouTube link]

> The form says "keep it under 3 minutes". Upload `counterpart_demo_new_vo_3min.mp4` from Downloads (2:44). The YouTube title, description and settings are at the end of this file.

### Live demo or deployment

https://successaje.github.io/counterpart/

The product site, with the loop animated and a demo of one request that runs in the browser: the room, the Desk, the redaction, the release. The Desk itself runs on localhost by design.

## Part 2 of 3, Track Details

### Pull requests

Leave blank. Not entering Best Core Contribution.

### Blog post

[Medium link to "Both sides brought an agent"]

The text is in `docs/POST.md`. Publish it on Medium first, then paste the link here.

### Your Wispr usage card

Leave blank unless you built with Wispr Flow. The card comes from the Wispr Flow desktop app: Insights, then Your usage, then Share.

### Your #HowISwitch post

[Link to the post]

A post to use, short enough for X and fine on LinkedIn:

> I spent the hackathon on one question: what if both sides of a bug report brought an agent, and neither handed over their machine?
>
> Counterpart puts a project's helpdesk and the reporter's own agent in one Switch room. The helpdesk may ask for six kinds of evidence, by code. Everything else is refused and written down. Every command stops at a page on the reporter's laptop and runs only when they say so. Redaction happens before anything leaves, and you can see what was removed, in place.
>
> Nothing leaves without you.
>
> Built on @SandboxAQ's Switch for the @WeMakeDevs Flip the Switch hackathon. Apache-2.0: github.com/successaje/counterpart
>
> #HowISwitch

## Part 3 of 3

### How did you use Switch in your project?

**Which agent.** Claude Code, connected through MCP. Counterpart ships a small MCP server, `counterpart mcp`, with nine tools and rules of engagement. `counterpart init` writes `.mcp.json` into the project, so an agent that Switch starts in that folder gets the runner without any extra setup. The templates take a `provider` parameter, so the same room works with Codex or OpenCode.

**Which platforms.** Mattermost, which ships with the self-hosted Switch, and Discord through the room template's `bridge` parameter. The self-host lives in `switch/self-host`: one script brings up a pinned Switch 0.31.0 with Mattermost and the Gateway, and another validates the templates against it.

**What real work it does.** Support for a dependency bug, end to end, between two people who do not trust each other's machines.

Two templates create the room:

- `support-room.template.yaml` creates the project's helpdesk and the `#<project>-support` room. The helpdesk admits anyone, so any reporter can bring a case. Its brief holds the evidence protocol, and the room carries two documents: the protocol and the case ledger.
- `dev-agent.template.yaml` creates the reporter's agent inside the reporter's own project, auto mode off, addressing owner-agents, and adds it to the room.

A case runs like this. The reporter says "cachekit 3.2.0 broke our S3 cache" in the room. The helpdesk opens a case and asks the reporter's agent for E1, versions, which is read-only and returns at once. It asks for E3, the failing test command. That request stops at the reporter's Desk: who asked, the exact words, the exact command, no shell. The reporter clicks Allow once. The runner runs it, redacts the output on their machine, and releases it. The helpdesk reads the stack trace, finds the hard-coded path in the plugin, and sends E6, a patch with a verifying command. The reporter approves that too. The test passes. The case closes as fix-verified, with every step in the ledger. When the helpdesk asks for something outside the menu, the reporter's agent refuses in one line and records the request verbatim.

**How teammates work with it.** The maintainer runs the helpdesk from the project repository and reads the evidence cards in the room. The reporter runs their own agent and keeps the Desk open; their only job is to answer three questions: allow once, allow for the case, or decline. Switch's own permission prompt in the room is a second gate above the Desk, and Switch records who answered it. Each owner sets their own addressing rule, and neither can change the other's. Remove Switch and there is no second agent, only one bot acting on someone else's behalf, which is the thing I was trying to leave.

I stood up Switch on my own machine, sent both templates to its validator, and got back no errors and no warnings on the afternoon of the last day. I could not sit on both sides of a live room by myself before the deadline, so I wrote the whole conversation as a script and play it against the real MCP server in CI on every push: a scripted helpdesk, the owner deciding through the CLI the way the Desk decides, every line one real tool call. Its first run found a redaction leak in my own code. I fixed it the same hour.

### What did you like about Switch, and what would you improve?

**What worked.** The one sentence in the docs that an agent inherits its owner's permissions and runs where its owner runs it. That is not a feature, it is a shape, and the whole product fell out of it: a room can hold two agents that answer to two different people on two machines. The template language made that shape expressible in a few lines: typed `params`, `{$creator}` and `{$agents_dir}` builtins, `addressing: anyone` on the helpdesk and `owner-agents` on the reporter's agent, `docs` on the room. The validator endpoint on the Gateway gave me a clean yes before I ever opened the Console. The self-host compose is published per release, so pinning a version and recording its checksum was easy. And because an agent inherits its provider setup from its working directory, a committed `.mcp.json` was all it took to put my MCP server in the agent's hands.

**What got in the way.** A custom addressing rule, letting one named helpdesk from another owner address my agent, is set in the Console after import, not in the template, so the reporter has one click to make by hand that I could not ship for them. The template language's version 2 needs agent management enabled on the server, so I wrote for version 1 and kept to what it offers. The compose file must be fetched by tag with `SWITCH_VERSION` set, which is right for reproducibility, but a first-time user has to find the tag name before anything runs. And there is no headless way to play a two-agent conversation for a test, which is why I wrote one.

**What I would want next.** A per-agent `mcp_servers` field in the agent block, so a template can attach tools without relying on the working directory. Addressing rules in the template, with the Console as the override. A dry run for templates that prints what will be created. A `switch self-host` command that does what my `up.sh` does. And a transcript export per room that a project could commit as its support ledger. I would use every one of these on the first day they existed.

## Before you press submit

1. **Upload the video** (the 2:44 cut) and paste its link above and into the README's Demo section.
2. **Publish the post** on Medium and paste the link above and at the end of `docs/POST.md`.
3. **Post the #HowISwitch text** and paste its link above.
4. **Deadline:** 7 November, 11:59 PM IST.

## YouTube upload

**File.** `~/Downloads/counterpart_demo_new_vo_3min.mp4` (2:44, 1280×720).

**Title.**

Counterpart: support where both sides bring an agent (Flip the Switch hackathon demo)

**Description.**

A dependency bug, reported and worked around in minutes, between two people who never hand over their machines.

Counterpart puts a project's helpdesk and the reporter's own agent in one Switch room. The helpdesk may ask for six kinds of evidence, by code: versions, config, a named command, a reproduction in a sandbox with no network, the recent diff, a patch to try. Every request that would run something stops at the Desk, a page on the reporter's laptop, and runs only when they allow it. Output is redacted on their machine before it leaves, and the Desk shows what was removed, in place. Anything outside the menu is refused and written down. In this demo the helpdesk asks for ~/.aws/credentials, and the reporter's agent says no.

Built on SandboxAQ's Switch for the WeMakeDevs Flip the Switch hackathon, 4–7 November 2026.

Code (Apache-2.0): https://github.com/successaje/counterpart
Write-up: [Medium link]
Switch: https://github.com/sandbox-quantum/switch

Chapters:
0:00 Both sides bring an agent
0:14 The bug
0:29 The support room
0:54 The Desk: allow once
1:08 What was removed, in place
1:24 The helpdesk reproduces and sends a patch
1:58 The hostile request, refused
2:10 The ledger and the case timeline
2:28 Nothing leaves without you

**Settings.** Visibility: Unlisted (the form accepts public or unlisted; unlisted keeps it out of search until you decide). Audience: not made for kids. Category: Science & Technology. Tags: Switch, SandboxAQ, WeMakeDevs, hackathon, AI agents, MCP, Claude Code, developer tools, open source. Comments: on. Thumbnail: the title frame (any frame from the first 3 seconds).
