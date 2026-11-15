# VG-PERF-002 — Bloated import

**Domain:** PERFORMANCE · **Severity:** Medium

## What VibeGuard flags

`import * as ns from 'pkg'` — a namespace import that defeats tree-shaking
and drags the whole library into the bundle.

## Secure rewrite

Import only what you use.

```js
// before
import * as _ from 'lodash';
import * as icons from '@icons/lib';

// after
import { debounce } from 'lodash-es';
import { SearchIcon } from '@icons/lib';
// or subpath imports when the package supports them:
import debounce from 'lodash/debounce.js';
```

- Prefer ESM builds (`lodash-es` over `lodash`) so the bundler can shake.
- If the namespace is genuinely used as a bag (plugin registry), keep it —
  but make that a conscious choice.

## Verify

Re-run `vibeguard_scan_file` — the finding clears. Optionally check the
bundle delta with your build's size report.
