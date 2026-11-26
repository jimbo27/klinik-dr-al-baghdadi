---
name: summarize
description: Use when the user wants text, a file, a web page or a conversation condensed to its key points.
argument-hint: "[text, file, URL or 'this conversation']"
disable-model-invocation: true
---

# Summarize

Input: $ARGUMENTS

The input may be pasted text, a file path, a URL, or "this conversation". Read the whole source before summarizing. If the input is empty, use the most recent relevant content in this conversation; if there is none, ask one short question about what to work on.

Output:

**TL;DR** — one sentence with the main point.

**Key points** — 3–7 bullets, most important first, each one fact or claim from the source.

**Decisions / action items** — only when the source contains them (who, what, by when).

Scale the length to the source: a short email gets 2–3 bullets. Add nothing the source doesn't say, and mark any comment of your own as such. Keep numbers, names and dates exact. When the user asks for a length or format ("in 50 words", "as a table"), follow that instead.
