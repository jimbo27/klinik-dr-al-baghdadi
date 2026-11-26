---
name: impact
description: Use when the user wants the consequences of a decision, change or proposal assessed, including who and what it affects.
argument-hint: "[decision, change or proposal]"
disable-model-invocation: true
---

# Impact

Input: $ARGUMENTS

If the input is empty, use the most recent relevant content in this conversation; if there is none, ask one short question about what to work on.

1. **What changes** — one sentence.
2. **Who and what is affected** — people, teams, customers, systems, money, time. For a code change, search the codebase for everything that depends on it and list it as `path:line`.
3. **Impact table** — each effect with: positive / negative, short / long term, likelihood (low / med / high), size (low / med / high).
4. **Second-order effects** — the knock-on consequences.
5. **Mitigations** — how to reduce the main negatives or amplify the positives.
6. **Verdict** — the net impact, whether to proceed, and the condition that would change that.

Use numbers where you can estimate them, and show the estimate.
