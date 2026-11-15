# 03 — CLI Reference & Terminal UI

[English](./03-cli.md) · [Português](./pt-BR/03-cli.md)

## Commands

| Command | Description |
| --- | --- |
| `vibeguard check` | General scan — audits the current directory (or a given path) with the configured analysis layers |
| `vibeguard check --deep` | Deep audit — forces priority files through the LLM layer for full semantic analysis |
| `vibeguard check --deps` | Dependency-focused scan — mitigates phantom/hallucinated dependency risk |
| `vibeguard check --all` | Combined audit — security + accessibility + performance |
| `vibeguard check --focus=perf,a11y` | Scoped audit on specific domains |
| `vibeguard check --history-only` | Only the git-history/leaked-secrets scan |
| `vibeguard check --staged --strict` | CI/pre-commit mode on staged changes |
| `vibeguard watch` | Continuous monitoring daemon — see [05 — Watch & History](./05-watch-and-history.md) |
| `vibeguard audit-history` | Historical commit scan — see [05 — Watch & History](./05-watch-and-history.md) |

## Output Formats

VibeGuard provides multiple formats for different development workflows:

- **Interactive terminal** — severity-colored highlights (Critical, High, Medium, Low) showing file, line, and a technical fix recommendation.
- **JSON / SARIF reports** — standard structured formats for CI/CD pipelines and integration with corporate security tooling.
- **HTML / Markdown report** (`--report`) — generates a static file (e.g., `vibeguard-report.html`) detailing the project's security, performance, and accessibility posture, shareable with managers or auditors.

## Output Modes

| Flag | Mode |
| --- | --- |
| `--interactive` (default) | Opens prompts letting the user fix the issue on the spot, ignore the warning, or view details |
| `--format json` | Machine-readable output for CI pipelines — the build can fail if the security score drops below the accepted threshold |
| `--report` | Generates a static report file for sharing |

## Terminal UI

Instead of cryptic JSON or a giant wall of text, the CLI uses modern terminal-formatting libraries (chalk, ora, cli-table3, ink/enquirer) to structure the report into friendly visual blocks.

### Live progress indicators

```text
⠋ Running deterministic scan (AST & Regex)...
✔ Deterministic scan complete (14ms)
⠋ Analyzing git commit history...
✔ History verified: no exposed .env in the last 50 commits.
⠋ Evaluating accessibility (A11y) and performance...
✔ 2 performance issues and 1 accessibility issue found.
```

### Findings grouped by domain & severity

```text
┌────────────────────────────────────────────────────────────────────┐
│ 🚨 VibeGuard Audit Report — 3 Issues Found                         │
└────────────────────────────────────────────────────────────────────┘

  [SECURITY] High Risk (line 42 in src/auth.ts)
  └── API secret key detected (possible token exposure).
      Suggestion: move to an environment variable in .env.

  [PERFORMANCE] Warning (line 12 in src/components/Hero.tsx)
  └── Native <img> used instead of the optimized <Image/> component.
      Impact: increased LCP (Largest Contentful Paint).

  [A11y] Notice (line 28 in src/components/Button.tsx)
  └── Interactive element without descriptive text or proper aria-label.
```

### Example invocations

```bash
# Full audit (security + a11y + performance) on the current project
npx vibeguard check --all

# History-only scan for secrets leaked in git
npx vibeguard check --history-only

# Scoped strictly to performance and accessibility
npx vibeguard check --focus=perf,a11y

# Continuous monitoring with custom debounce + OS notifications
npx vibeguard watch --debounce=500 --notify
```

This way, the CLI works as a robust, standalone command-line tool, delivering rich, immediate visual feedback before the code ever reaches an AI agent or a remote repository.

## Test Scenarios

BDD scenarios covering this document live in [`features/`](../features/):

- [`cli-commands.feature`](../features/cli-commands.feature) — `check` flags, staged/strict mode, output formats
- [`terminal-ui.feature`](../features/terminal-ui.feature) — progress indicators, grouped findings, severity colors
