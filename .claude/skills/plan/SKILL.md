---
name: plan
description: Use when the user wants a step-by-step action plan for a goal or project, with risks and a first action.
argument-hint: "[goal or project]"
disable-model-invocation: true
---

# Plan

Goal: $ARGUMENTS

If the input is empty, use the most recent relevant content in this conversation; if there is none, ask one short question about what to work on.

Produce the plan only; start executing once the user approves it.

1. **Goal** — the outcome in one sentence, and how you'll know it's done.
2. **Assumptions and constraints** — budget, time, people, tools. Ask one question only if the answer would change the plan completely.
3. **Steps** — numbered, in order, grouped into phases when long. Each step: what, who (if relevant), rough effort, what it depends on.
4. **Risks** — the 2–4 most likely problems and how to prevent or handle each.
5. **First action** — the one thing to do today.

For software work inside a project, read the relevant code first and name the exact files each step touches.
