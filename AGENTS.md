# VibeGuard CLI — Agent Notes

## Project Status

Implemented — `src/` contains a working zero-dependency CLI (`npm run cli`, bin `vibeguard`) and the full suite is green (`npm test` — 146 tests, 18 suites). `docs/` remains the spec source of truth; the test contract lives in `__tests__/README.md`.

## Source Layout (`src/`)

- `cli.js` — `parseArgs` + `main` (check / watch / audit-history), output formats, exit codes
- `scanner.js` — project/file orchestration; injectable `llm`, `classifier`, `registryClient`
- `layers/` — `deterministic.js` (secrets/CORS/eval/TLS + registry checks), `probabilistic.js` (entropy, anomaly, taint), `semantic.js` (LLM delegation), `llm.js` (OpenAI-compatible `createHttpLlm`, `isLocalUrl`, `resolveLlmConfig`/`loadLlm`, offline `createLocalEchoLlm`), `classifier.js` (optional local HF models via lazy `@xenova/transformers`)
- `analyzers/codeModel.js` — regex/heuristic code model behind a stable interface (AST parser is a planned swap)
- `a11y.js`, `performance.js`, `sanitize.js`, `severity.js`, `watcher.js`, `git/history.js`, `report/index.js`, `mcp/server.js`

All external boundaries are injected (`llm`, `classifier`, `registryClient`, `watcherFactory`, `fetchImpl`, `modelLoader`) — never hard-code providers or network clients inside the engines.

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
- Scenarios are spec-level (no step definitions) — the Jest suite in `__tests__/` is the executable counterpart, each test tracing back via `// features/...` comments. Add `.feature` files — or update existing ones — whenever the spec changes, keep both languages in sync, and back them with tests.
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
- `@xenova/transformers` is an optional peer — never import it eagerly; `classifier.js` lazy-imports and degrades cleanly when absent.
- Remote LLM calls must pass through `sanitizeSnippet` (already enforced in `semantic.js`/`llm.js` when `provider === 'remote'`); tests inject `fetchImpl` — never hit real network in tests.
