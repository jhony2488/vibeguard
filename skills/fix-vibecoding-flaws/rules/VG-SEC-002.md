# VG-SEC-002 — eval() on user-controlled input

**Domain:** SECURITY · **Severity:** Critical

## What VibeGuard flags

`eval(...)` fed by `req.*`, `request.*`, `input`, or `user`-derived values.
This is remote code execution: the caller controls what runs.

## Secure rewrite

Replace evaluation with explicit parsing or a whitelist dispatch.

```js
// before
const result = eval(req.query.expr);
const handler = eval(`handlers.${req.params.action}`);

// after — parse data, don't execute it
const result = JSON.parse(req.query.expr); // data only
const handlers = { resize, rotate, crop };
const handler = handlers[req.params.action]; // whitelist
if (!handler) return res.status(400).end();
```

- For math/dsl input use a real parser (e.g. `expr-eval`), never `eval`.
- For dynamic dispatch, map allowed names to functions — unknown keys fail.

## Verify

Re-run `vibeguard_audit_diff` — `VG-SEC-002` must be gone. Then grep the diff
for any remaining `eval(` / `new Function(` fed by request data.
