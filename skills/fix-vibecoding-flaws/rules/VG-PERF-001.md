# VG-PERF-001 — Unoptimized image

**Domain:** PERFORMANCE · **Severity:** Medium

## What VibeGuard flags

A native `<img>` in a Next.js project — skipping `next/image` means no
automatic resizing, format negotiation (WebP/AVIF), or lazy loading, which
directly hurts LCP.

## Secure rewrite

Swap to the framework's image component.

```jsx
// before
<img src="/hero.png" />;

// after
import Image from 'next/image';
<Image src="/hero.png" alt="Hero" width={1200} height={600} priority={isLcp} />;
```

- Always give `width`/`height` (or `fill`) — prevents layout shift (CLS).
- `priority` only for the LCP image; everything else stays lazy.
- Remote domains must be declared in `next.config.js` `images.remotePatterns`.

## Verify

Re-run `vibeguard_scan_file` — and as a bonus the `<Image/>` rewrite also
satisfies `VG-A11Y-001` once `alt` is present.
