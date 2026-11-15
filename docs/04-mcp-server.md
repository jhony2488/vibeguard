# 04 — MCP Server Integration

[English](./04-mcp-server.md) · [Português](./pt-BR/04-mcp-server.md)

The **Model Context Protocol (MCP)**, created by Anthropic, lets VibeGuard expose local analysis capabilities directly to assistants like Claude Desktop and Cursor, and to agents like Devin.

## Integration Architecture

VibeGuard operates as a security-analysis assistant that can be consumed at three levels:

```text
┌────────────────────────────────────────────────────────┐
│               Clients & Interfaces                     │
│  [VS Code / Cursor]      [Devin / Agents]     [CLI]    │
└───────────┬──────────────────────┬───────────────┬─────┘
            │ (JSON-RPC / stdio)   │ (MCP Server)  │ (Process)
            ▼                      ▼               ▼
┌────────────────────────────────────────────────────────┐
│          VibeGuard Core Protocol Server                │
│  • Deterministic engine (Regex / AST / Rules)          │
│  • Probabilistic engine (Entropy / Heuristics)         │
│  • Semantic engine (LLM Security Auditor)              │
└────────────────────────────────────────────────────────┘
```

## MCP Tools Exposed

### `vibeguard_scan_file`

- **Params:** `filePath: string`, `depth?: 'fast' | 'full'`
- **Purpose:** runs the deterministic + probabilistic checks in real time on a specific file.

### `vibeguard_scan_project`

- **Params:** `directory: string`, `ignorePatterns?: string[]`
- **Purpose:** scans the entire project before a commit or deploy.

### `vibeguard_audit_diff`

- **Params:** `gitDiff: string`
- **Purpose:** focused on agents like Devin or Cursor Agent — audits only the freshly generated changes before approving a write to disk.

### `vibeguard_explain_issue`

- **Params:** `ruleId: string`, `codeSnippet: string`
- **Purpose:** calls the semantic layer (LLM) to explain why a given "vibecoded" pattern is a security risk and generates the correct fix.

## Per-Tool / IDE Integration

### A. Cursor & Devin (via MCP)

Add the MCP server to the environment config (`mcp.json` or Cursor settings):

```json
{
  "mcpServers": {
    "vibeguard": {
      "command": "npx",
      "args": ["-y", "@vibeguard/mcp-server"],
      "env": {
        "VIBEGUARD_LLM_KEY": "your-api-key"
      }
    }
  }
}
```

**Agent behavior:** when the AI generates quick (vibecoded) code, it automatically calls `vibeguard_audit_diff` to audit its own output. If VibeGuard reports a high-severity issue (e.g., an exposed key or a hallucinated dependency), the agent fixes the flaw itself before delivering the task.

### B. VS Code (dedicated extension)

Integration happens on two fronts:

- **LSP / Diagnostics** — as the developer (or an autocomplete AI like Copilot) types in the editor, VibeGuard's deterministic and probabilistic layers run in the background and flag lines with red/yellow squiggles in the Problems panel.
- **Quick Fixes (Code Actions)** — clicking the lightbulb on a flagged problem offers **"VibeGuard: Fix VibeCoding Security Flaw"**, powered by the probabilistic/LLM layer.

### C. Git Hooks (pre-commit / pre-push)

Even outside IDEs, the system can be triggered automatically with tools like Husky:

```bash
npx vibeguard check --staged --strict
```

## Benefits

- **Prevention at the source** — instead of discovering vibecoded-code errors during testing or production, the AI agent fixes the code at generation time.
- **Optimized performance**:
  - *Deterministic/probabilistic layers* run instantly in the client/IDE (<20ms) to block obvious flaws.
  - *Semantic (LLM) layer* is invoked via MCP only for ambiguity or complex logical restructuring.
- **Full interoperability** — supporting the MCP standard makes VibeGuard compatible with Cursor, Devin, Claude Desktop, Windsurf, and any new agent or environment adopting the Anthropic spec.

## Test Scenarios

BDD scenarios covering this document live in [`features/`](../features/):

- [`mcp-server.feature`](../features/mcp-server.feature) — MCP tools, agent self-audit loop, `mcp.json` configuration
