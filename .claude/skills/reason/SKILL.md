---
name: reason
description: Use when the user wants a question, claim or decision reasoned through step by step, with assumptions and a confidence level.
argument-hint: "[question or problem]"
disable-model-invocation: true
---

# Reason

Input: $ARGUMENTS

If the input is empty, use the most recent relevant content in this conversation; if there is none, ask one short question about what to work on.

Answer in this shape:

1. **Question** — restate it in one sentence, including what a good answer must settle.
2. **Known facts** — what is given or can be verified. Check files, run commands or search when that settles a fact instead of assuming it.
3. **Assumptions** — what you are taking as true without proof, each marked so it can be challenged.
4. **Steps** — numbered inferences, each following from facts, assumptions or earlier steps. Name the step any weak link relies on.
5. **Check** — test the chain with a counter-example, an edge case or the strongest objection, and say whether it survives.
6. **Conclusion** — the answer, your confidence (high / medium / low), and the one fact that would change it.
