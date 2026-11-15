---
name: fix-vibecoding-flaws
description: Remediate VibeGuard findings. Use when a vibeguard_* tool reports a VG-* ruleId — loads the matching playbook for a secure rewrite and its verification steps.
metadata:
  version: '1.0.0'
---

# Fix VibeCoding Flaws

Remediation playbooks for every `VG-*` rule VibeGuard can report. When a
`vibeguard_scan_file`, `vibeguard_scan_project`, `vibeguard_audit_diff`, or
`vibeguard_audit_git_history` result contains a finding, this skill tells you
how to rewrite the flagged code safely — and how to prove the fix worked.

## How to use

1. Read the finding's `ruleId` (e.g. `VG-SEC-001`).
2. Load `rules/<ruleId>.md` — it describes the flaw, the secure rewrite, and
   the verification step.
3. Apply the rewrite with minimal churn: fix the flagged pattern, do not
   refactor around it.
4. Re-run the same `vibeguard_*` tool on the changed code — the finding must
   be gone before you finish.

If a single change triggers several findings, fix Critical/High severities
first, then re-audit once.

## Playbook index

| RuleId      | Flaw                             | Playbook                                     |
| ----------- | -------------------------------- | -------------------------------------------- |
| VG-SEC-001  | Exposed secret                   | [rules/VG-SEC-001.md](rules/VG-SEC-001.md)   |
| VG-SEC-002  | eval() on user input             | [rules/VG-SEC-002.md](rules/VG-SEC-002.md)   |
| VG-SEC-003  | Permissive CORS on write APIs    | [rules/VG-SEC-003.md](rules/VG-SEC-003.md)   |
| VG-SEC-004  | TLS verification disabled        | [rules/VG-SEC-004.md](rules/VG-SEC-004.md)   |
| VG-SEC-010  | Unsafe data flow (taint)         | [rules/VG-SEC-010.md](rules/VG-SEC-010.md)   |
| VG-SEC-011  | High-entropy string              | [rules/VG-SEC-011.md](rules/VG-SEC-011.md)   |
| VG-CORS-001 | Permissive CORS (semantic)       | [rules/VG-CORS-001.md](rules/VG-CORS-001.md) |
| VG-DEP-001  | Hallucinated package             | [rules/VG-DEP-001.md](rules/VG-DEP-001.md)   |
| VG-DEP-002  | Registry check failed            | [rules/VG-DEP-002.md](rules/VG-DEP-002.md)   |
| VG-CLS-001  | Classifier-flagged pattern       | [rules/VG-CLS-001.md](rules/VG-CLS-001.md)   |
| VG-HIST-001 | Secret in git history            | [rules/VG-HIST-001.md](rules/VG-HIST-001.md) |
| VG-HIST-002 | High-entropy string in history   | [rules/VG-HIST-002.md](rules/VG-HIST-002.md) |
| VG-HIST-003 | Hallucinated package in history  | [rules/VG-HIST-003.md](rules/VG-HIST-003.md) |
| VG-PERF-001 | Unoptimized image                | [rules/VG-PERF-001.md](rules/VG-PERF-001.md) |
| VG-PERF-002 | Bloated import                   | [rules/VG-PERF-002.md](rules/VG-PERF-002.md) |
| VG-A11Y-001 | `<img>` without alt              | [rules/VG-A11Y-001.md](rules/VG-A11Y-001.md) |
| VG-A11Y-002 | Non-semantic interactive element | [rules/VG-A11Y-002.md](rules/VG-A11Y-002.md) |
| VG-A11Y-003 | Broken heading hierarchy         | [rules/VG-A11Y-003.md](rules/VG-A11Y-003.md) |
| VG-A11Y-004 | Insufficient color contrast      | [rules/VG-A11Y-004.md](rules/VG-A11Y-004.md) |
