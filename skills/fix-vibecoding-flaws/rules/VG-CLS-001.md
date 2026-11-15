# VG-CLS-001 — Classifier-flagged pattern

**Domain:** SECURITY · **Severity:** Medium

## What VibeGuard flags

The optional local ML classifier marked this string/line as suspicious
(e.g. `SECRET`-like under a secrets model). It is a probabilistic signal:
review before assuming a true positive, but never silently dismiss it.

## Secure rewrite

- **True positive** — treat it like `VG-SEC-001`: move to env/secret manager,
  rotate if committed.
- **False positive** — make the intent explicit so future audits don't
  re-flag: rename to `TEST_*`/`EXAMPLE_*`, move to a fixtures file, or add a
  targeted `.vibeguardignore` entry with a comment.

```js
// before — classifier: SECRET 0.92
const salt = 'bV9fT2xKqL8wPzR4mN6yHdC3sUeA7jM1oG5iB0nE';

// after — intent is explicit
const TEST_SALT = 'bV9fT2xKqL8wPzR4mN6yHdC3sUeA7jM1oG5iB0nE'; // fixture only
```

## Verify

Re-run `vibeguard_scan_file` with the same `classifierModel` — the finding
clears, or the ignore entry is documented in the diff.
