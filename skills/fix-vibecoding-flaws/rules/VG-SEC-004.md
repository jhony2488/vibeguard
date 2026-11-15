# VG-SEC-004 — TLS verification disabled

**Domain:** SECURITY · **Severity:** High

## What VibeGuard flags

`NODE_TLS_REJECT_UNAUTHORIZED=0` or `rejectUnauthorized: false` — certificate
verification off, so any MITM can impersonate the remote service and read or
alter traffic.

## Secure rewrite

Fix the certificate chain instead of bypassing it.

```js
// before
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
https.get(url, { rejectUnauthorized: false });

// after — default verification, proper CA for internal certs
https.get(url, { ca: fs.readFileSync('internal-ca.pem') });
```

- Self-signed dev cert? Trust it locally (`ca` option or OS store), don't
  disable verification globally.
- `NODE_TLS_REJECT_UNAUTHORIZED=0` is process-wide — it disables TLS checks
  for _every_ outbound request, not just yours.

## Verify

Re-run `vibeguard_audit_diff` — the finding clears. Confirm no other file in
the diff re-introduces the env var.
