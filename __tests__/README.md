# VibeGuard Test Suite

[English](./README.md) · Jest · ESM (`"type": "module"`)

Spec-first suite translating every Gherkin scenario in [`features/`](../features/) (and its Portuguese mirror [`features/pt-BR/`](../features/pt-BR/)) into executable Jest tests.

> **Status: TDD-red by design.** The implementation does not exist yet — these tests define the expected public contract of `src/` and will fail (module-not-found) until the implementation lands.

## Running

```bash
npm install        # installs jest (only devDependency)
npm test           # full suite
npm run test:unit
npm run test:integration
```

Jest is invoked via `node --experimental-vm-modules` because the project is ESM.

## Assumed `src/` contract

The suite exercises this public API surface. It is a **living contract** — if the real implementation diverges, update the tests and this document together.

```text
src/cli.js              → main(argv) → Promise<exitCode>; parseArgs(argv) → config
src/scanner.js          → scanProject({ directory, focus, layers, ignore }) → Promise<ScanReport>
                          scanFile({ filePath, depth: 'fast' | 'full' }) → Promise<ScanReport>
src/layers/deterministic.js → analyzeDeterministic(code, ctx) → Finding[]
                              checkDependencies(manifest, { registryClient }) → Finding[]
src/layers/probabilistic.js → shannonEntropy(str) → number
                              scoreAnomaly(astNode) → number
                              estimateDataFlow(code, ctx) → Finding[]
                              estimateDependencyWeight(manifest) → { package, estimatedKb }[]
src/layers/semantic.js      → auditSemantic({ filePath, code, findings, llm }) → Finding[]
                              explainIssue({ ruleId, codeSnippet, llm }) → { explanation, patch }
src/severity.js         → classifyFinding(finding) → 'Critical' | 'High' | 'Medium' | 'Low'
                          meetsBlocking(findings, minSeverity) → boolean
src/sanitize.js         → sanitizeSnippet(code) → { code, masked: string[] }
src/watcher.js          → shouldIgnore(path, { gitignore, vibeguardignore }) → boolean
                          createDebouncer(fn, ms) → debounced fn
                          createWatcher({ dir, onBatch, debounceMs, watcherFactory }) → { close() }
                          shouldEscalate({ filePath, riskScore, threshold }) → boolean
src/git/history.js      → auditHistory({ cwd, maxCommits, secretsOnly, checkPerformance }) → HistoryFinding[]
src/a11y.js             → checkA11y(code, ctx) → Finding[]
src/performance.js      → checkPerformance(code, ctx) → Finding[]
src/report/index.js     → toJson(report) → object; toSarif(report) → object; renderTerminal(report) → string
src/mcp/server.js       → createMcpServer(deps) → { tools: string[], handleCall(name, params) }
```

### Finding shape

```ts
type Finding = {
  ruleId: string;
  domain: 'SECURITY' | 'PERFORMANCE' | 'A11y';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
  file: string;
  line: number;
  message: string;
  recommendation: string;
};
```

### Injected dependencies (part of the contract)

- `registryClient` — `{ exists(name) → Promise<boolean> }`; tests inject `helpers/mockRegistry.js`.
- `llm` — `{ audit({code, findings}), explain({ruleId, codeSnippet}), provider }`; tests inject `helpers/mockLlm.js`.
- `notifier` — OS notification sink injected into the watcher flow.
- `watcherFactory` — fs-watcher factory for injectable watch events.

## Scenario ↔ test traceability

Every test name mirrors its Gherkin scenario and carries a
`// features/<file>.feature — "<scenario>"` comment. Coverage map:

| Feature file | Test file(s) |
| --- | --- |
| `deterministic-scan.feature` | `unit/secret-patterns`, `unit/ast-rules`, `unit/registry-check` |
| `probabilistic-scan.feature` | `unit/entropy-anomaly-taint` |
| `semantic-audit.feature` | `unit/semantic` |
| `severity.feature` | `unit/severity` |
| `cli-commands.feature` | `unit/cli-args`, `unit/report`, `integration/cli` |
| `terminal-ui.feature` | `unit/report` |
| `mcp-server.feature` | `integration/mcp-tools` |
| `watch-mode.feature` | `unit/watcher`, `integration/watch-flow` |
| `git-history-audit.feature` | `integration/git-history` |
| `a11y-performance.feature` | `unit/a11y-performance` |
| `privacy.feature` | `unit/sanitize`, `integration/scan-pipeline` |

## Layout

```text
__tests__/
  unit/            # isolated modules — injected mocks, pure rules
  integration/     # multi-module flows — real git repo fixtures, spawned CLI
  helpers/         # mockLlm, mockRegistry, tmpProject (tmp dirs, fixture copies)
  fixtures/        # intentionally vulnerable "vibecoded" sample project
```
