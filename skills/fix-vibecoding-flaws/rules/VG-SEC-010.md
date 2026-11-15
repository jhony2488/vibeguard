# VG-SEC-010 — Unsafe data flow (taint)

**Domain:** SECURITY · **Severity:** Critical

## What VibeGuard flags

User-controlled input flowing into a dangerous sink without sanitization —
e.g. `req.query`/`req.body` interpolated into SQL, shell commands, or `eval`.
This is the classic injection path vibecoded apps ship by default.

## Secure rewrite

Break the flow: parameterize queries, escape output, validate input.

```js
// before
db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);
exec(`convert ${req.body.filename} out.png`);

// after
db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
execFile('convert', [sanitizeFilename(req.body.filename), 'out.png']);
```

- SQL: bound parameters only — never template literals with request data.
- Shell: `execFile` with an argv array, no string concatenation.
- Validate early: strict schemas (zod, JSON Schema) at the trust boundary.

## Verify

Re-run `vibeguard_audit_diff` — the finding clears when the sink no longer
receives raw request data.
