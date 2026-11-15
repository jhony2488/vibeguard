# VG-SEC-003 — Permissive CORS on write APIs

**Domain:** SECURITY · **Severity:** Medium

## What VibeGuard flags

`origin: '*'` (or `cors()` with no origin) on an API that accepts write
methods (`POST`/`PUT`/`PATCH`/`DELETE`). Any website can then drive writes
against your API from a user's browser.

## Secure rewrite

Restrict origins to an explicit allowlist.

```js
// before
app.use(cors({ origin: '*' }));

// after
const allowlist = (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || allowlist.includes(origin)),
    credentials: false,
  }),
);
```

- Keep `credentials: false` unless cookies/auth must cross origins — `*` +
  credentials is the dangerous combo browsers already block, so code often
  "works around" it insecurely.
- Public read-only GET APIs may keep `*` — scope it to those routes only.

## Verify

Re-run `vibeguard_audit_diff` — the finding clears when `*` is gone or the
write methods no longer share the permissive config.
