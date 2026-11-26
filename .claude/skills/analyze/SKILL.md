---
name: analyze
description: Use when the user wants text, data, code, a plan or a situation broken down into findings, evidence and recommendations.
argument-hint: "[text, data, file, URL or situation]"
disable-model-invocation: true
---

# Analyze

Input: $ARGUMENTS

The input may be text, data, a file path, a URL, code, a plan or a situation. Read files and pages in full before analyzing them. If the input is empty, use the most recent relevant content in this conversation; if there is none, ask one short question about what to work on.

Output:

1. **Bottom line** — the most important finding in one or two sentences, first.
2. **Breakdown** — the parts or factors that make up the subject and how they relate.
3. **Evidence** — what the content shows, with numbers, quotes or `path:line` references. Show calculations.
4. **Strengths / weaknesses** (or risks / opportunities, whichever fits).
5. **Patterns and anomalies** — what repeats, what stands out, what is missing.
6. **Implications** — what follows, and 2–4 recommended actions ranked by impact.

Keep what the evidence shows separate from your interpretation. Say where the data is too thin to conclude.
