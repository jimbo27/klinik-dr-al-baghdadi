---
name: customize
description: Use when the user wants to set how replies are shaped (language, length, tone, format), or have content tailored to given requirements.
argument-hint: "[preferences, or content + requirements]"
disable-model-invocation: true
---

# Customize

Input: $ARGUMENTS

- **Preferences** — the input says how the user wants replies (e.g. "short answers, Malay, bullet points, no emojis"). Confirm them in one line and apply them to every reply for the rest of this session. If the user asks to make them permanent, propose the addition to the project's CLAUDE.md and show it before saving.
- **Content + requirements** — the input gives content plus requirements (brand, tone, length, format, audience, language). Produce the customized version and list what changed.
- **Empty input** — ask which preferences to set: language, length, tone, format, level of detail.
