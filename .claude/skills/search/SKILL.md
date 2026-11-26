---
name: search
description: Use when the user wants information found, in this project's files, a connected service, or on the web, with sources.
argument-hint: "[what to find]"
disable-model-invocation: true
---

# Search

Query: $ARGUMENTS

Decide where the answer lives:
- **In this project** (code, pages, content in the repo) → search with Grep and Glob; report matches as `path:line` with a short excerpt.
- **On the web** → use WebSearch (if it isn't loaded, load it with ToolSearch `select:WebSearch`). Send 2–4 differently worded queries in one turn; open the most promising pages (WebFetch, or the web-fetch agent) when snippets aren't enough.
- **In a connected service** (Notion, Google Drive, GitHub…) → use that connector's search tool.

Report:
- **Answer** — the direct answer in 1–3 sentences.
- **Sources** — each finding with its link or path, and its date when that matters.
- **Gaps** — what you couldn't find or verify, and where sources conflict.

Only report what the search returned; if nothing turns up, say so.
