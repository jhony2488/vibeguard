# VibeGuard CLI — Agent Notes

## Project Status

Greenfield. The repository currently contains specification/architecture documentation only — the codebase (Node.js CLI) is not yet implemented. Treat `docs/` as the source of truth for intended behavior.

## Documentation

- Canonical docs live in `docs/` in **English**: `01-overview.md` through `06-a11y-performance.md`, indexed by `docs/README.md`.
- `docs/pt-BR/` mirrors every English doc in Portuguese, with identical file names and structure — keep both trees in sync when editing.
- `README.md` (root) is the entry point and links to both doc trees.

## Test Specifications (BDD)

- Gherkin scenarios live in `features/` (English, flat files by domain) and `features/pt-BR/` (Portuguese mirror, same file names, `# language: pt` header + `Funcionalidade`/`Cenário`/`Dado`/`Quando`/`Então` keywords).
- Scenarios are spec-level: the CLI is not yet implemented, so step definitions do not exist. Add `.feature` files — or update existing ones — whenever the spec changes, and keep both languages in sync.
- Tags follow the doc domains: `@layer1`–`@layer3`, `@critical`/`@high`/…, `@mcp`, `@watch`, `@history`, `@a11y`, `@performance`, `@ci`.

## Conventions

- Markdown docs use numbered prefixes (`01-`, `02-`, …) to enforce reading order.
- Every doc starts with a language-switcher line linking to its counterpart (`[English](...) · [Português](...)`).
- ASCII diagrams and terminal output examples go inside `text` fenced blocks; shell examples use `bash`; config uses `json`.
