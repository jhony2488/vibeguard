# VG-HIST-002 — High-entropy string in git history

**Domain:** SECURITY · **Severity:** High

## What VibeGuard flags

A random-looking literal committed in the past — probably a secret that
didn't match a known signature (internal token, generated password, webhook
secret).

## Secure rewrite

Same protocol as `VG-HIST-001`:

1. Identify what the string was for; **rotate it** if it was ever a real
   credential. When in doubt, rotate.
2. If it must stay in history (signed artifact, published hash), document
   why in the PR — otherwise purge with `git filter-repo --replace-text`.

```bash
git filter-repo --replace-text <(echo 'x9f2KpQ8zLm==>REMOVED')
git push --force-with-lease
```

## Verify

`vibeguard_audit_git_history` stops reporting the string, and any live
credential it represented is revoked.
