---
name: format
description: Use when the user wants content converted into another format, such as a table, list, JSON, CSV, email or slide outline.
argument-hint: "[content] as [format]"
disable-model-invocation: true
---

# Format

Input: $ARGUMENTS

If the input is empty, use the most recent relevant content in this conversation; if there is none, ask one short question about what to work on.

Reformat the content into the requested shape without changing its meaning: table, bullet list, numbered steps, headings, Markdown, JSON, CSV, YAML, email, letter, slide outline, FAQ, social-media post.

- Take the target format from the input. When none is given, choose the most readable one for the content and say which.
- Keep every fact, number and name. Content that doesn't fit the format goes in a "Notes" line.
- Data formats must be valid: parse-check JSON, CSV and YAML, and keep columns, casing and date formats consistent.
- When the input is a file, write the result to a new file unless the user asked to overwrite it.
