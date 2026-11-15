# VG-DEP-002 — Registry check failed

**Domain:** SECURITY · **Severity:** Medium

## What VibeGuard flags

The dependency could not be verified — the registry was unreachable
(timeout, offline, rate limit). The package _might_ be a hallucination; it
was simply impossible to confirm.

## Secure rewrite

No code change — re-verify, don't ignore.

- Retry `vibeguard_scan_project` when the network is back.
- Manually confirm the package exists: `npm view <name> version` should
  print a version, not `E404`.
- If the package doesn't exist → apply the `VG-DEP-001` playbook.
- In CI, treat this as a soft warning, not a pass: unverified deps in a PR
  deserve a second look before merge.

## Verify

`npm view <name>` resolves, or a clean `vibeguard_scan_project` run no longer
lists the dependency under `VG-DEP-001`/`VG-DEP-002`.
