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

### Per-call model selection

Every scan tool accepts optional model parameters so **the agent chooses the right model for the project context** — e.g., a secrets token-classifier on `.env`-ish files, an embedding model for similarity sweeps, or a code-tuned LLM for a TypeScript repo:

| Param | Effect |
| --- | --- |
| `model` + `llmUrl` (+`llmKey`) | overrides the semantic-layer LLM for that call (OpenAI-compatible endpoint) |
| `classifierModel` + `classifierTask` | attaches a local HF classifier (`text-classification` / `token-classification` / `feature-extraction` via `@xenova/transformers`) |

Each tool response includes `modelsUsed: { llm, classifier }` for transparency. Defaults come from the server env (`VIBEGUARD_LLM_*`, `VIBEGUARD_CLASSIFIER_*`).

## Served Skills (roadmap — SEP-2640)

Beyond tools, the official MCP **Skills extension** (`io.modelcontextprotocol/skills`, [SEP-2640](https://modelcontextprotocol.io/seps/2640-skills-extension), Final) lets a server ship Agent Skills — directories containing a `SKILL.md` plus supporting files — as MCP resources under `skill://` URIs. Servers implement `skills/list` and `skills/get`; clients read each file through `resources/read` (and optionally navigate directories via `resources/directory/read`).

For VibeGuard, this is the canonical path to go from *detecting* flaws to *teaching the agent how to fix them* — remediation guidance versioned alongside the ruleset:

| Skill | Purpose |
| --- | --- |
| `fix-vibecoding-flaws` | Remediation playbooks per `VG-*` rule — secure rewrites and verification steps |
| `secure-review-checklist` | Guided review workflow for agent-generated diffs |

Where `vibeguard_audit_diff` answers *"is this change safe?"*, a served skill answers *"how do I write it correctly?"* — e.g., after a finding, the agent loads the playbook for that rule instead of improvising a fix.

### Skill directory layout

Skills ship inside the `@vibeguard/mcp-server` package under `skills/`, one directory per skill — the directory name is the skill's `name`:

```text
skills/
  fix-vibecoding-flaws/
    SKILL.md                  # frontmatter + how to pick the right playbook
    rules/
      VG-SEC-001.md           # playbook: exposed secrets → env vars / secret managers
      VG-DEP-001.md           # playbook: hallucinated dependency → verified alternative
      VG-CORS-001.md          # playbook: permissive CORS → explicit allowlist
      ...                     # one file per rule (VG-SEC, VG-DEP, VG-A11Y, VG-PERF, VG-HIST)
  secure-review-checklist/
    SKILL.md                  # frontmatter + the review workflow
    checklists/
      agent-diff.md           # self-audit loop: generate → audit_diff → fix → re-audit
      pre-release.md          # project scan + git-history audit before shipping
```

Each `SKILL.md` starts with YAML frontmatter (`name`, `description`, `metadata.version`); the body teaches the agent *when* to load the skill and *how* to navigate its supporting files — e.g., mapping a finding's `ruleId` to `rules/<ruleId>.md`:

```yaml
---
name: fix-vibecoding-flaws
description: Remediate VibeGuard findings. Use when a vibeguard_* tool reports a VG-* ruleId — loads the matching playbook for a secure rewrite and its verification steps.
metadata:
  version: "1.0.0"
---
```

### Resource mapping (`skill://` URIs)

Every file in a skill directory is exposed as an MCP resource — `skill://<skill-path>/<file-path>`:

| File | Resource URI |
| --- | --- |
| `fix-vibecoding-flaws/SKILL.md` | `skill://fix-vibecoding-flaws/SKILL.md` |
| `fix-vibecoding-flaws/rules/VG-SEC-001.md` | `skill://fix-vibecoding-flaws/rules/VG-SEC-001.md` |
| `secure-review-checklist/checklists/agent-diff.md` | `skill://secure-review-checklist/checklists/agent-diff.md` |

Relative references inside a `SKILL.md` (e.g., `rules/VG-SEC-001.md`) resolve against the skill's root directory, exactly as filesystem skills do.

### Protocol surface

VibeGuard declares the extension — plus `directoryRead`, so agents can browse `rules/` without knowing every `VG-*` ID upfront:

```json
{
  "capabilities": {
    "resources": {},
    "extensions": {
      "io.modelcontextprotocol/skills": { "directoryRead": true }
    }
  }
}
```

| Method | Purpose |
| --- | --- |
| `skills/list` | Enumerates the served skills — each entry carries the verbatim `SKILL.md` frontmatter plus a complete `resources` manifest (`{uri, digest, size}` per file, SHA-256) |
| `skills/get` | Returns a single skill's entry by `SKILL.md` URI — e.g., to refresh digests after a ruleset update |
| `resources/read` | Base MCP read of any `skill://` file — how the agent actually fetches `SKILL.md` or a playbook |
| `resources/directory/read` | Lists a directory's direct children (files, and subdirectories as `inode/directory`) — e.g., `skill://fix-vibecoding-flaws/rules` |

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "skills/get",
  "params": { "uri": "skill://fix-vibecoding-flaws/SKILL.md" }
}
```

### Remediation flow

```text
[ vibeguard_audit_diff ] ── finding { ruleId: "VG-SEC-001", severity: "Critical" }
            │
            ▼
[ resources/read skill://fix-vibecoding-flaws/SKILL.md ]   (agent loads the skill)
            │
            ▼
[ resources/read skill://fix-vibecoding-flaws/rules/VG-SEC-001.md ]
            │
            ▼
[ Agent applies the playbook's secure rewrite ──► re-runs audit_diff to verify ]
```

> **Client support caveat:** the server only *serves* skill content — the host (Claude Code, Cursor, Devin, …) decides when to load it into model context and owns verification and approval: per SEP-2640's security model, skill content is untrusted input, digests guarantee consistency rather than trust, and persisted approvals are bound to the skill's file set. The SEP is Final, but host adoption is still ramping up, so this remains a roadmap item rather than a committed feature.

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
        "VIBEGUARD_LLM_URL": "https://api.openai.com",
        "VIBEGUARD_LLM_MODEL": "gpt-4o-mini",
        "VIBEGUARD_LLM_KEY": "your-api-key",
        "VIBEGUARD_CLASSIFIER_MODEL": "hf-model-id"
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

## Connecting from Other MCP Clients

The VibeGuard MCP server is a standard stdio server — any MCP-compatible client can run it via `npx -y @vibeguard/mcp-server`. The `VIBEGUARD_LLM_*` env vars are optional (omit the key entirely when using a local LLM such as Ollama at `http://localhost:11434`); `VIBEGUARD_CLASSIFIER_MODEL` enables the optional local HF classifier layer (`npm i @xenova/transformers` required).

| Client | Config file / method |
| --- | --- |
| Claude Desktop | `claude_desktop_config.json` |
| Claude Code | `claude mcp add` / `.mcp.json` |
| Codex CLI (ChatGPT) | `~/.codex/config.toml` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| VS Code | `.vscode/mcp.json` |
| Zed | `settings.json` → `context_servers` |
| Gemini CLI | `~/.gemini/settings.json` |

### Claude Desktop

Edit `claude_desktop_config.json`:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "vibeguard": {
      "command": "npx",
      "args": ["-y", "@vibeguard/mcp-server"],
      "env": { "VIBEGUARD_LLM_KEY": "your-api-key" }
    }
  }
}
```

Restart Claude Desktop — the `vibeguard_*` tools appear in the tools menu.

### Claude Code

```bash
# Project-scoped (writes .mcp.json) — shared with the team via git
claude mcp add vibeguard -- npx -y @vibeguard/mcp-server

# User-scoped — available in every project
claude mcp add --scope user vibeguard -- npx -y @vibeguard/mcp-server
```

Or commit a `.mcp.json` in the project root using the same `mcpServers` JSON shape as above.

### Codex CLI (ChatGPT)

Codex uses TOML — edit `~/.codex/config.toml`:

```toml
[mcp_servers.vibeguard]
command = "npx"
args = ["-y", "@vibeguard/mcp-server"]

[mcp_servers.vibeguard.env]
VIBEGUARD_LLM_KEY = "your-api-key"
```

> **Note:** ChatGPT on the web does not support local stdio MCP servers — it only supports remote HTTP connectors. Codex CLI is the recommended path for ChatGPT/OpenAI workflows.

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json` (Windows: `C:\Users\<you>\.codeium\windsurf\mcp_config.json`):

```json
{
  "mcpServers": {
    "vibeguard": {
      "command": "npx",
      "args": ["-y", "@vibeguard/mcp-server"],
      "env": { "VIBEGUARD_LLM_KEY": "your-api-key" }
    }
  }
}
```

### VS Code (Copilot Agent Mode)

Create `.vscode/mcp.json` in the workspace — note the key is **`servers`**, not `mcpServers`:

```json
{
  "servers": {
    "vibeguard": {
      "command": "npx",
      "args": ["-y", "@vibeguard/mcp-server"],
      "env": { "VIBEGUARD_LLM_KEY": "your-api-key" }
    }
  }
}
```

### Zed

In `settings.json`, use `context_servers` — the command lives under `command.path`/`command.args`:

```json
{
  "context_servers": {
    "vibeguard": {
      "command": {
        "path": "npx",
        "args": ["-y", "@vibeguard/mcp-server"],
        "env": { "VIBEGUARD_LLM_KEY": "your-api-key" }
      }
    }
  }
}
```

### Gemini CLI

Edit `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "vibeguard": {
      "command": "npx",
      "args": ["-y", "@vibeguard/mcp-server"],
      "env": { "VIBEGUARD_LLM_KEY": "your-api-key" }
    }
  }
}
```

## Test Scenarios

BDD scenarios covering this document live in [`features/`](../features/):

- [`mcp-server.feature`](../features/mcp-server.feature) — MCP tools, agent self-audit loop, `mcp.json` configuration, served skills (SEP-2640)
