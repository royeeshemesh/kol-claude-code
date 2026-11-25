# Changelog

Dated entries, newest first. The plugin has no version field, so an install follows the latest commit on the default branch (see the Update section of the README).

## 0.1.0 (2026-11-25)

First public release of Kol for Claude Code, in early access.

- Plugin `kol` in the marketplace `kol`: `/kol:setup`, `/kol:status` and `/kol:line`.
- Sign-in with a code from the Kol app, with no prompts in the terminal (`kol-cc login --start`, then `--wait`).
- The Kol line: a background worker that takes the turns. Each turn is a read-only `claude -p` (Read, Grep, Glob) inside the project folder.
- Questions and progress reach your Claude Code session through the plugin's monitor and prompt hook, plus Mac notifications and an optional "answer now" window.
- Always-on Kol line on macOS (a LaunchAgent), and an optional Kol status line.
- A clear message when your Kol account isn't enabled for early access yet.
