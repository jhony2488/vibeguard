# Pre-release security review

Run before merging a large change, tagging a release, or deploying — the
project-level counterpart of the agent-diff loop.

## Steps

1. **Full project scan.** Call `vibeguard_scan_project`:

   ```json
   { "directory": ".", "ignorePatterns": ["dist/**", "node_modules/**"] }
   ```

   Fix Critical/High findings via the `fix-vibecoding-flaws` playbooks.

2. **History sweep.** Leaks often live in old commits, not the working tree.
   Call `vibeguard_audit_git_history`:

   ```json
   { "directory": ".", "maxCommits": 100, "secretsOnly": true }
   ```

   Any `VG-HIST-*` finding means the credential is compromised — rotate it;
   deleting the line does not undo a committed leak.

3. **Dependencies.** `VG-DEP-001` findings (packages missing from the
   registry) are likely AI hallucinations or typosquats — replace them with
   verified alternatives before shipping.

4. **Re-verify.** Re-run `vibeguard_scan_project` until Critical/High are
   clear. Locally, `vibeguard check --strict` enforces the same gate in CI.

## Done when

- `vibeguard_scan_project` reports no Critical/High findings.
- `vibeguard_audit_git_history` reports no unrotated `VG-HIST-*` findings.
- Every `VG-DEP-001` package is replaced or verified.
