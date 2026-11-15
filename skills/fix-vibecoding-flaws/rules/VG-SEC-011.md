# VG-SEC-011 — High-entropy string

**Domain:** SECURITY · **Severity:** High

## What VibeGuard flags

A long random-looking string literal — statistically likely to be a secret
(token, key, password) even though it didn't match a known signature.

## Secure rewrite

Treat it as a secret until proven otherwise: move it to the environment.

```js
// before
const webhookSecret = 'x9f2KpQ8zLmRvT4yHwBnC6sDuEaG7jM1';

// after
const webhookSecret = process.env.WEBHOOK_SECRET;
```

- If it is genuinely not a secret (test vector, hash, fixture), mark it
  clearly — e.g. name it `TEST_*`, load it from a fixture file, or add it to
  `.vibeguardignore` with a comment justifying it.

## Verify

Re-run `vibeguard_audit_diff` — the finding clears. If it _was_ a real
credential, rotate it and check `vibeguard_audit_git_history`.
