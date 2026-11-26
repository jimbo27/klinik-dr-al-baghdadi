---
name: code
description: Use when the user wants working code written, changed or explained, in a project or standalone.
argument-hint: "[what the code should do]"
disable-model-invocation: true
---

# Code

Task: $ARGUMENTS

1. **Context first** — inside a project, read the relevant files and follow the project's language, style, libraries and structure. Otherwise use the language the user named, or pick the most suitable one and say why in one line.
2. **Complete, working code** — no pseudo-code and no "…rest of implementation" gaps. Handle realistic errors and edge cases; leave out speculative abstraction.
3. **Verify** — run it, its tests, or a quick check (build, lint, a sample input) when the environment allows. Report the actual result; if you could not run it, say so.
4. **Explain briefly** — how to run or use it, and any assumption or limitation. Keep the explanation shorter than the code.

Edit existing files in place rather than pasting whole files into chat. Commit or push only when asked.
