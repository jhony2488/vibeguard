# VG-DEP-001 — Hallucinated package

**Domain:** SECURITY · **Severity:** High

## What VibeGuard flags

A `package.json` dependency that does not exist in the registry — the classic
AI hallucination. Installing a name that doesn't exist invites
typosquatting/dependency-confusion: anyone can publish malware under it.

## Secure rewrite

Remove it or replace it with a verified, published alternative.

```json
// before
"dependencies": { "express-validator-pro": "^9.0.0" }   // doesn't exist

// after — pick the real package the model probably meant
"dependencies": { "express-validator": "^7.2.0" }
```

- Search the registry for the intended package; check the AI didn't invent a
  plausible-sounding name (`-pro`, `-js`, `-utils` suffixes are typical).
- If it was a placeholder, implement the 5-line function locally instead of
  depending on nothing.

## Verify

Re-run `vibeguard_scan_project` — `VG-DEP-001` clears when every dependency
resolves in the registry.
