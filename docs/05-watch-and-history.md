# 05 — Watch Mode & Git-History Audit

[English](./05-watch-and-history.md) · [Português](./pt-BR/05-watch-and-history.md)

## Continuous Monitoring (`watch` / daemon)

Watch mode lets VibeGuard run in the background as a local daemon, listening to filesystem changes in real time without blocking the workflow.

### How it works

1. **Low-impact watcher (chokidar / fs.watch)**
   - Listens for file creation, modification, and rename in the project directory.
   - Automatically filters directories like `node_modules`, `.git`, `dist`, and files declared in `.gitignore` or `.vibeguardignore`.

2. **Analysis queue with debounce (execution buffer)**
   - When an AI or developer edits continuously (e.g., saving every 500ms), VibeGuard waits for a configurable pause (e.g., 1000ms) before firing the audit — avoiding excessive CPU usage.

3. **Incremental layer-escalation pipeline**
   - **Step 1 (immediate):** runs only the deterministic + probabilistic layers on changed files (<15ms).
   - **Step 2 (on demand / threshold):** if the risk probability hits a configured threshold — or a critical file changes (`.env`, API routes, auth middleware) — the semantic (LLM) layer is triggered.

4. **Native notifications & terminal dashboard**
   - Displays a dynamic panel in the terminal (interactive TUI/CLI style).
   - On a severe finding (e.g., a secret key pasted by Copilot/Cursor), it can fire a native OS notification (macOS, Windows, Linux).

### CLI

```bash
# Start continuous monitoring of the current project
npx vibeguard watch

# Monitoring with severity filter and custom delay
npx vibeguard watch --path ./src --debounce 1000 --min-severity high
```

## Git-History Audit (`audit-history`)

Before starting continuous monitoring — or on first run in an existing project — VibeGuard can perform a historical scan of the git tree.

### Interactive CLI prompt (onboarding)

```text
? Scan previous git commit history before starting?
❯ [Y] Yes — map commit history for exposed secrets/keys (.env)
  [N] No — audit only the current state of the files
```

### What the commit mapping analyzes

- **History scan (`git log -p` / AST diffing)** — analyzes not only the HEAD but all changes saved in past commits (even ones later overwritten or deleted from the current code).
- **Historical `.env` & credential detection** — searches for API keys (`sk-proj-...`, `AKIA...`), JWT tokens, database connection strings (`postgres://...`), or environment variables committed by mistake.
- **Probabilistic entropy check** — analyzes the randomness of strings added in the history to catch variable-length tokens that regex would miss.
- **Hallucinated / vibecoded code audit** — identifies whether old commits introduced nonexistent npm/PyPI packages (vulnerable to dependency confusion / typosquatting).
- **Mitigation report** — if a secret is found in a two-week-old commit, VibeGuard shows the exact commit hash and affected lines, suggests history-rewrite commands (`git filter-repo` or BFG Repo-Cleaner), and warns to revoke the key immediately.

### CLI

```bash
# Full audit of the last 100 commits (or the whole tree)
npx vibeguard audit-history --commits 100

# Strictly focused on .env leaks and secrets
npx vibeguard audit-history --detect-secrets
```

## MCP Tools

When VibeGuard runs as an MCP server connected to Cursor or Devin, these capabilities become new tools:

- **`vibeguard_start_watch`** — activates background monitoring during the AI agent's pairing session.
- **`vibeguard_audit_git_history`** — lets the agent (e.g., Devin) scan the repository's commit history to verify nothing confidential leaked before opening a Pull Request.

## Flow Summary

```text
[ Start: npx vibeguard ]
           │
           ▼
[ Interactive prompt: audit git history? ]
     ├── (Yes) ➔ [ Commit scan: old .env files, keys & hallucinated packages ]
     └── (No)  ➔ [ Skip to the current state ]
           │
           ▼
[ Full 3-layer audit (Deterministic + Probabilistic + LLM) ]
           │
           ▼
[ Prompt: keep the project under continuous monitoring (watch)? ]
     └── (Yes) ➔ [ Background file watcher + instant security notifications ]
```

## Test Scenarios

BDD scenarios covering this document live in [`features/`](../features/):

- [`watch-mode.feature`](../features/watch-mode.feature) — file watcher, ignore filters, debounce, layer escalation, OS notifications
- [`git-history-audit.feature`](../features/git-history-audit.feature) — interactive prompt, historical secrets, mitigation report
