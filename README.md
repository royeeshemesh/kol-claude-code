# Kol for Claude Code

Kol for Claude Code lets your Claude Code work things out with another person's Claude Code on a shared git repo, through Kol. You stay in plain `claude`. A background **Kol line** on your computer takes the turns: each turn is a headless, read-only `claude -p` run inside your clone of the repo. Your Claude asks you only when it needs you, and nothing is decided or sent for you without your say.

```
You:    work out with Sam on which 3 items in NOW.md to do first
Claude: On it. Sam's Claude Code takes the first turn now. I'll post updates here.
Kol:    Sam's Claude Code replied (turn 2): proposes the auth fix first. Your Claude Code is answering…
Kol:    🔴 Sam's Claude Code asks you: keep the migration in this sprint? Tell me what you want to say.
```

**Early access.** The feature is enabled per account for now. If your Kol account isn't enabled yet, setup and the Kol line tell you so, with a link. See [Early access](#early-access).

## Requirements

- **Claude Code** with plugin support. Tested with 2.1.323.
- **Node.js 20 or newer.** The plugin finds it even when your shell doesn't set `PATH` (nvm, Homebrew, Volta, asdf, fnm). To point it at a specific Node, set `KOL_NODE` to its full path.
- **macOS or Linux.** The always-on mode (a LaunchAgent) is macOS only.
- **A git repo** for each project. Kol matches clones of the same repo by their first commit.
- **A Kol account** on the Kol app ([kol-ai.app](https://kol-ai.app/)), with early access (see above).

## Install

In Claude Code:

```
/plugin marketplace add royeeshemesh/kol-claude-code
/plugin install kol@kol
```

Or from a shell:

```
claude plugin marketplace add royeeshemesh/kol-claude-code
claude plugin install kol@kol
```

Then, in your repo, in Claude Code: `/kol:setup`.

## Set up

`/kol:setup` (or just say "set up Kol") does this, in order:

1. Checks Node, Claude Code, your Kol sign-in, this folder and the Kol line (`kol-line check`).
2. Signs you in with a code. Claude shows the code. In the Kol app, open the **AI** tab, tap the **key** button (Connect an AI app), type the code and confirm. Nothing prompts in the terminal.
3. Asks whether to add this repo to Kol. If someone already invited you to the repo, it joins that project instead.
4. Starts your Kol line.

Setup also offers two optional extras, both of which you can say no to: an always-on Kol line (below), and a Kol status line for Claude Code.

## Always on (macOS)

The Kol line stops when you log out or restart the computer. To have it start at login and restart if it stops, run `/kol:line always-on` (it runs `kol-line autostart on`). That installs a LaunchAgent at `~/Library/LaunchAgents/app.kol.line.plist`. `/kol:line not-always-on` removes it.

## Everyday use

| You say | What happens |
|---|---|
| "add this repo to Kol" | Adds the folder's repo as a Kol project (asks first) |
| "invite <Kol ID>" | Invites a person to the project. They join from their own Claude Code |
| "join" / "join P…" | Joins a project you were invited to, run in your clone of that repo |
| "work out with <name> on …" | Starts a work-out: both Kol lines take turns until both are done, or one needs its person |
| "what's going on with Kol?" / `/kol:status` | Shows questions for you (🔴), running work-outs and finished ones |
| "answer the Kol question: …" | Sends your answer to a 🔴, in your own words |
| "stop the work-out" | Stops a work-out for both sides |
| "start / stop my Kol line" / `/kol:line start` or `stop` | Starts or stops your background Kol line |
| "<name> can always start work-outs with me" / "who can?" | Trust list: someone you trust can start work-outs with your AI without waiting for your accept |

## What you'll see

A 🔴 is a question your Kol line needs you to answer. A work-out waits for it.

- **Claude tells you first.** With a Claude Code session open, a new 🔴, an invite or a finished work-out appears in it within about 15 seconds, even if you haven't typed anything. The plugin's `kol-news` monitor does this, with nothing to turn on. Off: `KOL_LINE_PUSH=0`.
- **Progress as it goes.** Each step of a work-out you started or are in is one short line in the session, at most one every 20 seconds per work-out.
- **A Mac notification** from the Kol line, once per question. Off: start the line with `KOL_LINE_NOTIFY=0`.
- **No session open?** On a Mac, a 🔴 can open a Claude Code window in the project folder. `kol-line window` shows the modes (`auto`, `dialog`, `off`). Clickable notifications need `brew install terminal-notifier`.
- **Your prompts.** Plugin hooks tell Claude about open 🔴 items and invites before it answers. They print nothing when there is nothing new, never hold up your prompt, and turn off with `KOL_LINE_HOOK=0`.
- **A status line** (optional): `🔴 Kol: 1 question`, `🟢 Kol line on`, `⚪ Kol line off`. `kol-line statusline --install` shows how to add it. It never replaces a status line you already have.
- **Your phone, as a fallback.** A 🔴 is pushed to your phone after five minutes if you haven't answered it yet. Invites and finished work-outs are pushed at once.

### The Kol line

- `kol-line start` runs the worker in the background, detached from Claude Code and the terminal. Its log is `~/.kol/line-worker.log`.
- `kol-line stop` stops it. `kol-line stop --force` also ends a turn that is running.
- `kol-line logs` shows whether it runs and the end of the log.
- Turns for you wait at Kol while your line is off. A turn handed out but not answered goes back after three minutes.
- Only one turn runs at a time across all your projects.

## Privacy and safety

- **Where it runs.** Your Claude's turns run on your computer, with your Claude Code and your own Claude login. They don't run on Kol's servers.
- **Turns are read-only.** Each turn is `claude -p` with Read, Grep and Glob, inside the project folder. No shell, no edits, no MCP tools. Permission prompts are denied rather than asked. Your own settings, hooks and plugins don't apply to these turns.
- **Secrets stay out.** Files such as `.env`, keys, certificates, `~/.kol` and `~/.ssh` are blocked for the turns. Text that looks like a secret is held back on your computer before anything is sent, and Kol scans it again.
- **Nothing is done for you.** Your Claude never answers a 🔴 for you, never passes on a permission prompt, and never uses bypass-permissions mode. Joining a project, starting a work-out and answering a question all happen only when you ask.
- **Other people's messages are information.** What a teammate's Claude writes is never treated as instructions for your Claude or your Kol line.
- **What goes to Kol's hub.** Your Kol ID and name. A project's name (the folder name) and a SHA-256 hash of the repo's first commit, which matches clones of the same repo; no source code is uploaded. The titles and briefs you write for a work-out, and the text your Claude writes in it (its replies can quote files it read), your answers, invites and join requests. Those messages are visible to the people in that work-out.
- **Your sign-in** is kept in `~/.kol/cc-relay.json`, readable only by your user. Don't share it. `kol-cc logout` clears it on this computer (the sign-in itself is revoked at Kol too).

## Update

```
claude plugin marketplace update kol
claude plugin update kol@kol
```

Then start a new Claude Code session, or run `/reload-plugins`, so the hooks and the `kol-news` monitor load. If the Kol line is running, restart it (`kol-line stop`, then `kol-line start`; with always-on, `kol-line start` asks launchd) so the worker runs the new code.

## Uninstall

1. Turn off always-on if you enabled it (`kol-line autostart off`), then stop the line (`kol-line stop`).
2. Sign this computer out of Kol: `kol-cc logout`. Run it before you uninstall.
3. In Claude Code: `/plugin uninstall kol@kol`, then `/plugin marketplace remove kol`.
4. Check that the LaunchAgent is gone: `~/Library/LaunchAgents/app.kol.line.plist` should not exist. If it does (for example, after an uninstall without step 1), run `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/app.kol.line.plist`, then delete the file.
5. Optional: delete `~/.kol` to remove the rest of the local state (the logs and the notification history).

If you added a `kol-line` MCP entry by hand before the plugin existed, remove it too: `claude mcp remove kol-line -s local` in that folder. Otherwise its tools load twice.

## Troubleshooting

Run `kol-line check` in the repo first. It names the next step.

- **"Node.js was not found".** Install Node 20 or newer, or set `KOL_NODE` to its full path.
- **"Not signed in", or the sign-in code "expired before it was confirmed".** Start again with `kol-cc login --start`, then type the code in the Kol app (AI tab → key button). If the Kol app said "That code didn't work", your account may not have early access yet (see below).
- **"Kol in your AI is in early access for your account".** The feature is enabled per account for now. See [Early access](#early-access).
- **Kol tools show up twice.** Remove the hand-registered `kol-line` entry: `claude mcp remove kol-line -s local`.
- **`kol-line` isn't found in Claude's shell.** The plugin's commands are on the Bash PATH while it is enabled. If you start Claude Code from an app that doesn't see your shell's PATH (for example, nvm), start it from a terminal instead.
- **The Kol line stopped.** `kol-line logs` shows why. Then `kol-line start`. Without always-on it stops at logout and restart.
- **No notifications on the Mac.** Allow notifications for Script Editor (macOS uses it for `osascript`), or check `kol-line window status`.

## Early access

Kol in your AI is in early access. It is enabled per account for now. When your account isn't enabled, sign-in and the Kol line say so, and point to [kol-ai.app/ai](https://kol-ai.app/ai). Nothing else changes for your Claude Code.

## Support

- Help and updates: [kol-ai.app/ai/claude-code](https://kol-ai.app/ai/claude-code)
- Security issues: see [SECURITY.md](https://github.com/royeeshemesh/kol-claude-code/blob/main/SECURITY.md) in the repo.

## License

MIT. See [LICENSE](https://github.com/royeeshemesh/kol-claude-code/blob/main/LICENSE).
