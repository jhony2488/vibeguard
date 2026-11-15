# VibeGuard CLI — Agent Notes

## Project Status

Greenfield. The repository currently contains specification/architecture documentation only — the codebase (Node.js CLI) is not yet implemented. Treat `docs/` as the source of truth for intended behavior.

## Documentation

- Canonical docs live in `docs/` in **English**: `01-overview.md` through `06-a11y-performance.md`, indexed by `docs/README.md`.
- `docs/pt-BR/` mirrors every English doc in Portuguese, with identical file names and structure — keep both trees in sync when editing.
- `README.md` (root) is the entry point and links to both doc trees.

## Test Suite (`__tests__/`)

- Jest (ESM, `node --experimental-vm-modules`). The `src/` contract documented in `__tests__/README.md` is implemented — keep contract doc and tests in sync when it evolves.
- `unit/` isolates modules via injected mocks (`helpers/mockLlm.js`, `mockRegistry.js`); `integration/` covers multi-module flows (fixture project, real git repo in tmp, spawned CLI).
- Every test carries a `// features/<file>.feature — "<scenario>"` comment tracing it back to the Gherkin spec.
- The code model is regex/heuristic-based (`src/analyzers/codeModel.js`) behind a stable interface — a real AST parser can replace it without changing layer contracts.

## Test Specifications (BDD)

- Gherkin scenarios live in `features/` (English, flat files by domain) and `features/pt-BR/` (Portuguese mirror, same file names, `# language: pt` header + `Funcionalidade`/`Cenário`/`Dado`/`Quando`/`Então` keywords).
- Scenarios are spec-level: the CLI is not yet implemented, so step definitions do not exist. Add `.feature` files — or update existing ones — whenever the spec changes, and keep both languages in sync.
- Tags follow the doc domains: `@layer1`–`@layer3`, `@critical`/`@high`/…, `@mcp`, `@watch`, `@history`, `@a11y`, `@performance`, `@ci`.

## Conventions

- Markdown docs use numbered prefixes (`01-`, `02-`, …) to enforce reading order.
- Every doc starts with a language-switcher line linking to its counterpart (`[English](...) · [Português](...)`).
- ASCII diagrams and terminal output examples go inside `text` fenced blocks; shell examples use `bash`; config uses `json` (or `toml` for Codex).
- MCP client-setup recipes live in `docs/04-mcp-server.md` — when adding a new client, add it to the summary table, give it a subsection with a copy-paste config, and mirror it in `docs/pt-BR/04-mcp-server.md`.
- Contribution rules (≤20 files/PR, commit prefixes, required SSH-signed commits, mandatory doc sync) live in `CONTRIBUTING.md` + `CONTRIBUTING.pt-BR.md` at the root.

## Tooling

- ESLint 9 flat config (`eslint.config.js`), Prettier (`.prettierrc.json`), Husky hooks in `.husky/`: `pre-commit` → `npm run lint`, `pre-push` → `npm test`.
- `.npmrc` sets `ignore-scripts=true`, so Husky's `prepare` does not auto-run — run `npx husky` once after `npm install` to enable the hooks. Do not weaken `.npmrc` security settings (`min-release-age`, `allow-git`).
- `__tests__/fixtures/` is intentionally vulnerable code — excluded from ESLint.
