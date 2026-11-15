# Contributing to VibeGuard

[English](./CONTRIBUTING.md) · [Português](./CONTRIBUTING.pt-BR.md)

Thanks for helping build VibeGuard — a security, accessibility, and performance auditor for AI-generated code. This guide covers how to set up your environment and the rules every contribution follows.

## Ways to Contribute

- **Bug reports & feature requests** — open an issue describing the vibecoding pattern or audit behavior you have in mind.
- **Documentation** — fixes and improvements to `docs/` (see _Docs are the source of truth_ below).
- **Test scenarios** — new Gherkin scenarios in `features/` describing behavior before it exists.
- **Code** — bug fixes and features in `src/`, always tied to the spec.

## Development Setup

Requirements: **Node.js ≥ 18.18** (ESM project; Jest runs via `--experimental-vm-modules`).

```bash
npm install
npx husky   # required — .npmrc sets ignore-scripts=true, so `prepare` does not auto-run
```

| Command                    | Purpose                                          |
| -------------------------- | ------------------------------------------------ |
| `npm test`                 | Full Jest suite (unit + integration)             |
| `npm run test:unit`        | Unit tests only (`__tests__/unit`)               |
| `npm run test:integration` | Integration tests only (`__tests__/integration`) |
| `npm run lint`             | ESLint over the repo                             |
| `npm run lint:fix`         | ESLint with autofix                              |
| `npm run format`           | Prettier write                                   |
| `npm run format:check`     | Prettier check (no writes)                       |

> `.npmrc` ships security settings (`min-release-age=7`, `ignore-scripts=true`, `allow-git=none`). Do not weaken or bypass them — if a new dependency fails the release-age gate, pin an older version instead.

### Known advisories

- **deepmerge (CVE-2026-93753 / GHSA-gcqx-w48m-w2h4)** — `npm audit` flags the transitive dev-dep `jest → jest-config → deepmerge@4.3.1`. **Do not fix**: there is no patched release (even `jest@30` still pulls it), the only `audit fix --force` path downgrades to jest 25, and the CVE was rejected by the CNA (2026-11-02) as not describing a real vulnerability. It's also dev-only — nothing reaches the published package. Revisit when a patched deepmerge ships or the advisory is withdrawn.

## Docs Are the Source of Truth

`docs/` defines intended behavior; the code implements it. **Every PR that changes behavior must update the docs**, and the docs are bilingual:

- `docs/*.md` — canonical, in English
- `docs/pt-BR/*.md` — Portuguese mirror, same file names and structure
- `features/*.feature` — Gherkin scenarios (English)
- `features/pt-BR/*.feature` — Portuguese mirror (`# language: pt` header, `Funcionalidade`/`Cenário`/`Dado`/`Quando`/`Então` keywords)

Keep both trees in sync in the same PR. Every doc starts with a language-switcher line linking to its counterpart. See `AGENTS.md` for the full doc/test conventions.

## Pull Request Rules

- **≤ 20 changed files per PR.** Larger PRs are accepted only with a valid justification in the PR description (e.g., a mechanical rename, generated files, or a docs-mirror sync). Reviewers may still ask you to split it.
- **One concern per PR** — don't mix a feature with unrelated refactors or formatting sweeps.
- **Draft PRs are welcome** for early feedback; mark ready when the checklist below is green.
- Hooks are local guards — CI checks are authoritative and must pass before merge.

## Commit Conventions

Commits use Conventional-Commits-style prefixes:

| Prefix             | Use for                                   |
| ------------------ | ----------------------------------------- |
| `feat:`            | New user-facing behavior                  |
| `fix:` / `bugfix:` | Bug fixes                                 |
| `test:` / `tests:` | Adding or changing tests only             |
| `docs:`            | Documentation and `.feature` spec changes |
| `refactor:`        | Behavior-neutral restructuring            |
| `perf:`            | Performance improvements                  |
| `style:`           | Formatting/whitespace only                |
| `chore:`           | Tooling, deps, build plumbing             |
| `ci:`              | CI configuration                          |
| `build:`           | Build system or packaging                 |
| `revert:`          | Reverting a previous commit               |

An optional scope is allowed — `feat(mcp): serve skills via SEP-2640`. Write the subject in the imperative, ≤72 chars, e.g. `fix: ignore .env symlinks in scanProject`.

## Signed Commits (required)

All commits **must be SSH-signed**. Set it up once:

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub   # your public key
git config --global commit.gpgsign true
```

Then upload the same public key to GitHub → _Settings → SSH and GPG keys → New SSH key → Key type: Signing Key_, so commits show as **Verified**.

PRs containing unsigned commits will be asked to re-sign (`git rebase --signoff`/`git commit --amend -S`) before review.

## Code Style & Tooling

| Tool     | Config                                                      | Enforcement                                   |
| -------- | ----------------------------------------------------------- | --------------------------------------------- |
| ESLint 9 | `eslint.config.js` (flat config, ESM + Node + Jest globals) | `pre-commit` hook → `npm run lint`            |
| Prettier | `.prettierrc.json`                                          | `npm run format` / `format:check`             |
| Husky    | `.husky/`                                                   | `pre-commit` → lint · `pre-push` → `npm test` |

Run `npm run lint` and `npm run format` before pushing. Follow the existing code style — see `AGENTS.md` and neighboring files when in doubt.

## Testing Conventions

- Jest (ESM) — tests live in `__tests__/unit/` and `__tests__/integration/`.
- Spec-first: every test carries a `// features/<file>.feature — "<scenario>"` comment tracing it to the Gherkin spec.
- Unit tests isolate modules via injected mocks (`__tests__/helpers/`); integration tests cover multi-module flows (fixture project, real git repo in tmp, spawned CLI).

## PR Checklist

- [ ] `npm run lint` and `npm test` pass locally
- [ ] Behavior changes are documented — `docs/` EN **and** `docs/pt-BR/` updated
- [ ] Spec scenarios updated — `features/` EN **and** `features/pt-BR/`
- [ ] Commits follow the prefix conventions and are SSH-signed
- [ ] ≤ 20 changed files — or a justification is included in the PR description
- [ ] New tests carry the `// features/... — "scenario"` traceability comment
