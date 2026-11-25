---
description: Start, stop or check my background Kol line, or keep it always on (start | stop | status | always-on | not-always-on)
argument-hint: "start | stop | status | always-on | not-always-on"
allowed-tools: Bash(kol-line logs:*), Bash(kol-line check:*), Bash(kol-line autostart status)
---

My background Kol line: "$ARGUMENTS"

- `start` (or "on"): run `kol-line start`. Tell me what it printed. Mention that it keeps running after this session and stops on logout or restart.
- `stop` (or "off"): run `kol-line stop`. If it says it is still ending a turn, ask me before running `kol-line stop --force`.
- `status`, or nothing: run `kol-line logs 15` and `kol-line autostart status`. Summarize: is it running, is it connected to Kol, the last few turns, any errors.
- `always-on` (or "autostart"): run `kol-line autostart on` (a macOS LaunchAgent: it starts at login and restarts if it dies). Tell me what it printed.
- `not-always-on`: run `kol-line autostart off`. It also stops the worker launchd runs; mention `kol-line start` for now.

The Kol line only reads: each turn is a headless `claude -p` with Read, Grep and Glob in the project's folder. Never change that, and never add permission flags.
