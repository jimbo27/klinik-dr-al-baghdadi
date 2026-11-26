---
name: improve
description: Use when the user wants text, code, a plan or a process made better, with a list of what changed.
argument-hint: "[content to improve, optional goal]"
disable-model-invocation: true
---

# Improve

Input: $ARGUMENTS

Works on text, code, designs, plans, prompts and processes. If the input is empty, use the most recent relevant content in this conversation; if there is none, ask one short question about what to work on.

1. **Diagnose** — the 3–5 changes that would make the biggest difference (clarity, correctness, structure, persuasiveness, performance, readability: whatever matters for this kind of thing).
2. **Improved version** — in full, ready to use. For code in a project, edit the file and verify it still works.
3. **What changed** — a short list of the main changes and why.

Keep the original intent, voice and facts. When the user names a goal ("more persuasive", "faster", "shorter"), optimize for that above everything else.
