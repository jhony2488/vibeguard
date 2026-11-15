---
name: secure-review-checklist
description: Guided security-review workflows for AI-generated code. Use to self-audit diffs before writing them to disk, or to run a full pre-release review of a project.
metadata:
  version: '1.0.0'
---

# Secure Review Checklist

VibeGuard answers "is this change safe?" — this skill answers "what should I
check, and in what order?". Pick the checklist that matches the moment:

| Checklist          | When                                            | File                                                   |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------ |
| Agent diff loop    | You generated code — audit it before delivering | [checklists/agent-diff.md](checklists/agent-diff.md)   |
| Pre-release review | About to commit, tag, or deploy                 | [checklists/pre-release.md](checklists/pre-release.md) |

When a check reports a finding, load the `fix-vibecoding-flaws` skill and open
`rules/<ruleId>.md` for the remediation playbook instead of improvising a fix.
