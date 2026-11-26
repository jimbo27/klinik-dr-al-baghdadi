---
name: checklist
description: Use when the user wants a task, process or document turned into an actionable checklist.
argument-hint: "[task, process or document]"
disable-model-invocation: true
---

# Checklist

Input: $ARGUMENTS

If the input is empty, use the most recent relevant content in this conversation; if there is none, ask one short question about what to work on.

Turn it into an actionable checklist:

- Markdown checkboxes (`- [ ]`), grouped under short headings by phase or area, in the order the work is done.
- Each item starts with a verb and is concrete enough to tick off ("Email the signed contract to finance", not "Handle paperwork").
- The checks people commonly forget: backups, approvals, telling the people affected, a final review.
- ⚠️ on critical items, and deadlines or owners where known.

Split into sub-checklists past about 25 items. Offer to save it as a file.
