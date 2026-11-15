# VG-HIST-003 — Hallucinated package in git history

**Domain:** SECURITY · **Severity:** High

## What VibeGuard flags

A past commit introduced a dependency that doesn't exist in the registry —
usually a model hallucination. Even if later removed, it signals the codebase
was (or is) exposed to dependency-confusion risk.

## Secure rewrite

1. Confirm the current `package.json` no longer lists it — if it does, apply
   `VG-DEP-001` (replace with the verified package).
2. If it shipped in any released version, audit what the package was supposed
   to do — the model may have substituted its own implementation, which needs
   review, not just removal.
3. History rewriting is usually unnecessary here (no secret leaked), but
   ensure no lockfile still pins it:

```bash
rm -rf node_modules package-lock.json
npm install   # regenerate the lockfile clean
```

## Verify

`vibeguard_scan_project` + `vibeguard_audit_git_history` are clean, and the
lockfile contains only resolvable packages.
