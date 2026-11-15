# VG-HIST-001 — Secret in git history

**Domain:** SECURITY · **Severity:** Critical

## What VibeGuard flags

`vibeguard_audit_git_history` found a credential in a past commit. The code
may be clean now — but anyone with repo access can still read the old blob.
The secret is compromised.

## Secure rewrite

Two steps, in this order — removal alone is _not_ a fix:

1. **Rotate the credential.** Revoke/regenerate it at the provider. This is
   the only step that actually closes the leak.
2. **Purge history (optional but recommended)** so clones stop carrying it:

```bash
# rewrite history — coordinates with the whole team
git filter-repo --replace-text <(echo 'sk-live-secret==>REMOVED')
# or: git filter-branch / BFG Repo-Cleaner
git push --force-with-lease
```

- Update the current code to read from env (`VG-SEC-001` playbook).
- History rewrites invalidate open PRs — schedule it, don't surprise people.

## Verify

- The old credential is rejected by the provider (rotated).
- `vibeguard_audit_git_history` no longer lists it after the rewrite.
