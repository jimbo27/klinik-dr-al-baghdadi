---
name: safety
description: Use when the user wants a plan, product, content, code or activity checked for safety, privacy, security, legal or reputational risks.
argument-hint: "[plan, content, code or activity]"
disable-model-invocation: true
---

# Safety

Input: $ARGUMENTS

If the input is empty, use the most recent relevant content in this conversation; if there is none, ask one short question about what to work on.

Check each relevant area:
- **People** — physical injury, health, vulnerable groups (children, patients, the elderly).
- **Privacy and data** — personal or medical data, consent, storage, sharing, local data-protection law.
- **Security** — accounts, passwords, access; for code: injection, secrets in files, unvalidated input.
- **Legal and compliance** — licences, advertising rules, regulations for the user's country and industry.
- **Financial and reputational** — losses, misleading claims, public backlash.

Output a table (risk, severity low / med / high / critical, likelihood, fix), then the top 3 actions in priority order.

Name specific risks in this input rather than generic warnings. Say plainly when a qualified professional (doctor, lawyer, engineer) must check something.
