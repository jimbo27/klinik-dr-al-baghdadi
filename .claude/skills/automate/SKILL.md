---
name: automate
description: Use when the user wants a repetitive task automated with a script, scheduled task, workflow or formula.
argument-hint: "[task to automate]"
disable-model-invocation: true
---

# Automate

Task: $ARGUMENTS

1. **Understand the manual process** — steps, inputs, outputs, how often it runs, who does it, where the data lives. Ask only for what you can't see yourself.
2. **Choose the simplest tool that works** — a script (bash, Python, Node), a spreadsheet formula, a scheduled task, a Claude Code hook or skill, a GitHub Action, or an existing app's built-in automation. Say why in one line and estimate the time saved.
3. **Build it** — working code or configuration with the settings at the top, logging, and safe failure: no silent data loss, and a dry-run mode for anything that deletes, sends or pays.
4. **Test it** on sample data and show the result.
5. **Hand over** — how to run it, schedule it and stop it.

Ask before switching on anything that runs on a schedule, sends messages, spends money or changes external systems.
