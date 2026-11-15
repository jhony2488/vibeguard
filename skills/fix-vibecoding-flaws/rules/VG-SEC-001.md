# VG-SEC-001 — Exposed secret

**Domain:** SECURITY · **Severity:** Critical

## What VibeGuard flags

A hardcoded credential in source: API keys (`sk-...`, `AKIA...`, `ghp_...`),
JWTs, database URLs with embedded passwords, or `apiKey/password/token = "..."`
assignments. Anything committed is compromised — even if you delete it later.

## Secure rewrite

Move the value to the environment; never inline it.

```js
// before
const apiKey = 'sk-proj-abc123...';
const db = 'postgres://user:hunter2@db.internal:5432/app';

// after
const apiKey = process.env.OPENAI_API_KEY;
const db = process.env.DATABASE_URL;
```

- Put real values in `.env` (listed in `.gitignore`) or a secret manager
  (AWS Secrets Manager, Vault, Doppler).
- Load them with `dotenv` locally or platform env vars in CI/deploys.

## Verify

1. **Rotate the credential** — removal does not undo the leak.
2. Re-run `vibeguard_scan_file` / `vibeguard_audit_diff` — the finding must
   disappear.
3. Run `vibeguard_audit_git_history` — if the secret is in history, follow
   `VG-HIST-001`.
