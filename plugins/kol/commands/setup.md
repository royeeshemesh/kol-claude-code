---
description: Set up Kol here (sign in with a code from the Kol app, add this repo, turn on the Kol line, keep it always on)
allowed-tools: Bash(kol-line check:*), Bash(kol-line window), Bash(kol-cc login:*), mcp__plugin_kol_kol-line__kol_me
---

Set up the Kol line on this computer and for this repo. Follow the setup steps of the `kol` skill:

1. Run `kol-line check` and do only what it lists under "Next".
2. If it says you're not signed in: run `kol-cc login --start`. Show me the code and where to type it in the Kol app. Then run `kol-cc login --wait` with a 600000 ms Bash timeout. Exit 2 means I haven't confirmed yet: ask me, then run it again.
3. If this repo isn't on Kol yet, ask me before adding it (`kol_project_add` with `folder` = the current working directory). If I'm invited to it, offer `kol_join` instead.
4. If the Kol line isn't running, offer to start it (`kol-line start`). Tell me it stops on logout or restart.
5. On a Mac, if check says autostart is off, offer to keep the Kol line always on (a LaunchAgent: starts at login, restarted if it dies). Only if I say yes, run `kol-line autostart on` and tell me what it printed.
6. On a Mac, run `kol-line window` and tell me in one line what happens to a 🔴 when no Claude Code session is open. If terminal-notifier is missing, tell me `brew install terminal-notifier` makes the notification clickable (it opens Claude Code with the question), or offer the "Answer now?" dialog (`kol-line window dialog`, only on my yes). Don't install anything yourself.
7. Offer the Kol status line (🔴 Kol: 1 question / 🟢 Kol line on). Only if I say yes, run `kol-line statusline --install --apply`. It never replaces a status line I already have; tell me what it printed.
8. If check found a hand-registered `kol-line` MCP entry, tell me and offer the removal command it printed.

Never run plain `kol-cc login`, `kol-cc setup` or `kol-cc start` here.

Extra instructions from me, if any: $ARGUMENTS
