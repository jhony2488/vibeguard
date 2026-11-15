# Agent diff self-audit loop

Run this loop every time you generate or modify code — before the change is
delivered as done.

## Steps

1. **Capture the diff.** Collect exactly what you are about to write as a
   unified git diff (added lines are what get audited).

2. **Audit it.** Call `vibeguard_audit_diff` with the diff:

   ```json
   { "gitDiff": "<unified diff>" }
   ```

3. **Triage the findings.**
   - `blocked: true` (any Critical/High) → do not ship. Fix every blocking
     finding first.
   - Medium/Low → fix or consciously accept, and say which.

4. **Fix via playbook.** For each finding, load
   `skill://fix-vibecoding-flaws/rules/<ruleId>.md` and apply the secure
   rewrite — do not improvise around a security rule.

5. **Re-audit.** Call `vibeguard_audit_diff` on the updated diff. Repeat
   until it returns no blocking findings.

6. **Explain if asked.** If the user wants to understand a finding, call
   `vibeguard_explain_issue` with `ruleId` + `codeSnippet`.

## Done when

`vibeguard_audit_diff` reports `blocked: false` and every remaining Medium/Low
finding has an explicit accept-or-fix note.
