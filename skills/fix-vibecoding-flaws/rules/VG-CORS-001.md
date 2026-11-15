# VG-CORS-001 — Permissive CORS (semantic)

**Domain:** SECURITY · **Severity:** Medium

## What VibeGuard flags

The semantic (LLM) layer judged this CORS configuration too permissive for
the endpoint's context — e.g. wildcard origin on authenticated or
state-changing routes, or credentials combined with a broad origin list.

## Secure rewrite

Scope CORS to what the route actually needs.

```js
// before
app.use(cors({ origin: true, credentials: true })); // reflects any origin

// after
app.use(
  '/api',
  cors({
    origin: ['https://app.example.com'],
    credentials: true, // only when cookies must cross origins
  }),
);
app.get('/api/public/status', cors({ origin: '*' }), handler); // read-only
```

- `origin: true` mirrors the caller's Origin — equivalent to `*`, but _with_
  credentials. Never on authenticated endpoints.
- Split middleware: permissive for public reads, strict for everything else.

## Verify

Re-run `vibeguard_audit_diff` — then call `vibeguard_explain_issue` with this
ruleId if you need the endpoint-specific reasoning replayed.
