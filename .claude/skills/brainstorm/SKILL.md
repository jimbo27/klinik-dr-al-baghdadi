---
name: brainstorm
description: Use when the user wants an interactive brainstorming session that explores many ideas and then narrows them down.
argument-hint: "[topic or problem]"
disable-model-invocation: true
---

# Brainstorm

Topic: $ARGUMENTS

If the input is empty, use the most recent relevant content in this conversation; if there is none, ask one short question about what to work on.

Run a two-phase session with the user.

**Diverge** — 15–20 ideas, grouped into 3–5 themes. Include wild ones, build on whatever the user has already said, and hold back judgment in this phase.

**Converge** — rate the ideas on impact and effort, merge duplicates, and shortlist the top 3–5 with one line each on why.

Then ask one question to steer the next round (which theme to push further, a constraint to add). Keep iterating until the user picks a direction, then offer /plan to turn it into steps.
