# 06 — Accessibility (A11y) & Performance

[English](./06-a11y-performance.md) · [Português](./pt-BR/06-a11y-performance.md)

Extending VibeGuard beyond security turns it into a **full quality auditor** for AI-generated (vibecoded) code. Language models frequently slip on these fronts — forgetting `aria-*` attributes and semantic tags, generating heavy React components without optimization, or importing entire libraries unnecessarily.

Here's how these new fronts integrate into the system's three layers.

## Layer 1 — Deterministic Static Analysis

Just as it scans for leaked keys and vulnerabilities, the deterministic layer runs a fast AST-based pass with predefined rules over freshly generated code.

**Accessibility checks:**

- `<img>` elements missing the mandatory `alt` attribute.
- Non-native interactive elements (`<div>` / `<span>` with `onClick`) lacking proper accessibility properties (`role="button"`, `tabIndex={0}`).
- Static color-contrast validation in stylesheets (Tailwind, CSS Modules) and incorrect heading hierarchy (e.g., `h1` skipping to `h4`).

**Performance checks:**

- Heavy unoptimized images — e.g., native `<img>` in frameworks like Next.js instead of the optimized `<Image/>` component.
- Bloated, poorly structured imports — `import * as _ from 'lodash'` instead of importing only the needed function (which inflates the AI-generated bundle).
- Heavy loops or unnecessary re-renders in front-end components.

## Layer 2 — Size & Complexity Heuristics

- **Cyclomatic-complexity metric** — flags overly long or branched functions the AI tends to emit as a single block ("God Functions"), hurting runtime performance and maintainability.
- **Dependency weight** — analyzes the AI-generated `package.json` to estimate bundle-size impact before allowing the dependency install.

## Layer 3 — Semantic Logic Audit & Auto-Refactoring

When the AI generates code that is functional but structurally inefficient or inaccessible, the semantic layer fixes the problem at the root:

- **Impact explanation** — points out the snippet and details why it harms users with disabilities (violating WCAG guidelines) or degrades application load time (Core Web Vitals).
- **Automatic fix generation** — the AI engine proposes the corrected patch: swapping generic tags for accessible semantic ones, applying lazy loading to heavy components, and so on.

## CLI & Watch Mode

```bash
# Full audit (security + accessibility + performance) on the project
npx vibeguard check --all

# Continuous mode scoped to accessibility and performance
npx vibeguard watch --focus a11y,performance

# Historical scan for severe performance/accessibility debt in old commits
npx vibeguard audit-history --check-performance
```

This expansion ensures vibecoded code is not only safe against breaches and leaks, but also delivers a high-performance, inclusive experience to end users.

## Test Scenarios

BDD scenarios covering this document live in [`features/`](../features/):

- [`a11y-performance.feature`](../features/a11y-performance.feature) — a11y checks, performance checks, LLM-generated fixes
