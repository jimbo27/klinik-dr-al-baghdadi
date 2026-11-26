---
name: translate
description: Use when the user wants text translated between languages while keeping meaning, tone and formatting.
argument-hint: "[text] to [language]"
disable-model-invocation: true
---

# Translate

Input: $ARGUMENTS

If the input is empty, use the most recent relevant content in this conversation; if there is none, ask one short question about what to work on.

1. Identify the source language and the target. The target comes from the input ("to Arabic", "ke Bahasa Melayu", "in English"). If none is given: translate into English when the source is not English; when the source is English, ask which language.
2. Translate meaning, not word by word. Keep tone, register (formal / casual), formatting, line breaks, names, numbers and placeholders.
3. Use the phrasing a native speaker would write. Use the established terms of the field (medical, legal, technical) and keep brand and product names as they are.
4. Output the translation first, in a block the user can copy. Below it, note only real ambiguities or culturally sensitive choices (at most 3); no notes if there are none.

For legal, medical or official documents, add one line suggesting review by a qualified translator before publication.
