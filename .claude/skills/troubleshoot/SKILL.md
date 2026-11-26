---
name: troubleshoot
description: Use when something is not working and the user wants it diagnosed and fixed step by step.
argument-hint: "[what is going wrong]"
disable-model-invocation: true
---

# Troubleshoot

Problem: $ARGUMENTS

Diagnose before fixing.

1. **Symptoms** — what happens, what should happen, when it started, what changed just before. Ask only for what you can't check yourself.
2. **Reproduce** — trigger the problem (run the command, open the page, read the logs) and capture the exact error.
3. **Hypotheses** — 2–4 likely causes ranked by probability, each with its evidence.
4. **Test** — one hypothesis at a time, with the cheapest decisive test; record each result.
5. **Fix** the root cause rather than the symptom.
6. **Verify** — rerun the reproduction, confirm the problem is gone, and check nothing else broke.
7. **Prevent** — one line on how to stop it recurring.

For software bugs in a project, follow the superpowers:systematic-debugging skill when it is available. For devices, apps or services you can't access, give the user numbered steps to try, simplest first, and say what each result means.
