# VibeGuard Documentation

[English](./README.md) · [Português (pt-BR)](./pt-BR/README.md)

Specification and architecture documentation for the VibeGuard CLI — a layered security, accessibility, and performance auditor for AI-generated code.

## Contents

| Doc | Topic |
| --- | --- |
| [01 — Overview](./01-overview.md) | The vibecoding problem & VibeGuard's goals |
| [02 — Architecture](./02-architecture.md) | 3-layer audit engine, severity matrix, privacy |
| [03 — CLI](./03-cli.md) | Commands, flags, output formats, terminal UI |
| [04 — MCP Server](./04-mcp-server.md) | Model Context Protocol tools & IDE/agent integration |
| [05 — Watch & History](./05-watch-and-history.md) | Continuous monitoring daemon & git-history audit |
| [06 — A11y & Performance](./06-a11y-performance.md) | Accessibility and performance auditing |

## BDD Test Scenarios

Executable specifications (Gherkin) for the behavior described in these docs live in [`features/`](../features/), with a Portuguese mirror in [`features/pt-BR/`](../features/pt-BR/). Each doc links to its corresponding `.feature` files at the bottom — and the Jest suite in [`__tests__/`](../__tests__/) is the executable implementation of those scenarios (see [`__tests__/README.md`](../__tests__/README.md) for the `src/` contract).
