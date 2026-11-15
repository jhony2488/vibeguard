# VibeGuard CLI

> Security, accessibility & performance auditing for AI-generated ("vibecoded") code — deterministic, probabilistic, and LLM-semantic analysis in one CLI.

VibeGuard is a Node.js command-line tool designed to inspect, classify, and report flaws in projects built with AI-assisted development. It acts as an automated review gate, combining high-speed deterministic checks with statistical analysis and context-aware semantic reasoning.

## Why VibeGuard?

Vibecoded systems tend to ship characteristic vulnerability patterns:

- **Redundant or hallucinated dependencies** — exposed to typosquatting and package-hallucination attacks.
- **Authentication & authorization shortcuts** — prototyping workarounds forgotten in production.
- **Exposed secrets & credentials** — model-provided examples left in the final source.
- **Permissive business logic** — API routes that trust client-supplied parameters.

## Quickstart

```bash
# Full audit of the current project
npx vibeguard check

# Continuous monitoring (watch mode)
npx vibeguard watch

# Scan git history for leaked secrets
npx vibeguard audit-history --commits 100
```

## Commands

| Command | Description |
| --- | --- |
| `vibeguard check` | General audit (deterministic + probabilistic + LLM layers) |
| `vibeguard check --deep` | Deep audit — forces the LLM semantic pass on priority files |
| `vibeguard check --deps` | Dependency-tree scan only (hallucinated/phantom packages) |
| `vibeguard watch` | Continuous file-watcher mode with live notifications |
| `vibeguard audit-history` | Scans git history for leaked secrets & hallucinated deps |

## Documentation

- [Full documentation — English](docs/README.md)
- [Documentação completa — Português](docs/pt-BR/README.md)

## MCP Integrations

VibeGuard runs as a standard stdio MCP server — `npx -y @vibeguard/mcp-server`. Per-client setup recipes:

| Client | Config |
| --- | --- |
| Claude Desktop | `claude_desktop_config.json` |
| Claude Code | `claude mcp add` / `.mcp.json` |
| Codex CLI (ChatGPT) | `~/.codex/config.toml` |
| Cursor / Devin | `mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| VS Code | `.vscode/mcp.json` |
| Zed | `settings.json` → `context_servers` |
| Gemini CLI | `~/.gemini/settings.json` |

Full instructions: [docs/04-mcp-server.md](docs/04-mcp-server.md) · [pt-BR](docs/pt-BR/04-mcp-server.md)

## Testing (BDD)

Executable specifications in Gherkin describe every behavior in the docs — the three analysis layers, severity classification, CLI commands, MCP tools, watch mode, git-history audit, a11y/performance, and privacy guarantees.

- Scenarios (English): [`features/`](features/)
- Cenários (Português): [`features/pt-BR/`](features/pt-BR/)

These are spec-level scenarios — step definitions are wired up as the implementation lands.
