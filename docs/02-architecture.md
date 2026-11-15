# 02 — Layered Audit Architecture

[English](./02-architecture.md) · [Português](./pt-BR/02-architecture.md)

To deliver fast execution without compromising analysis depth, VibeGuard uses a **defense-in-depth** approach split into three sequential, complementary layers.

```text
        [ Project Directory / Source Code ]
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ LAYER 1: Deterministic Analysis                          │
│ • AST parsing (Abstract Syntax Tree)                     │
│ • Fixed-pattern recognition & regular expressions        │
│ • Package-registry existence checks                      │
└───────────────────────────┬──────────────────────────────┘
                            │ (runs in milliseconds)
                            ▼
┌──────────────────────────────────────────────────────────┐
│ LAYER 2: Probabilistic & Heuristic Analysis              │
│ • Shannon entropy calculation (secret detection)         │
│ • Statistical complexity & structure analysis            │
│ • Estimated unsafe data-flow mapping                     │
└───────────────────────────┬──────────────────────────────┘
                            │ (conditional / filtered execution)
                            ▼
┌──────────────────────────────────────────────────────────┐
│ LAYER 3: Semantic Reasoning via LLM                      │
│ • Contextual business-logic evaluation                   │
│ • Authorization flaw detection (IDOR)                    │
│ • Intent validation & complex edge cases                 │
└──────────────────────────────────────────────────────────┘
```

## Layer 1: Deterministic Analysis

Focused on strict, immutable, ultra-low-latency rules. Its goal is to filter obvious problems and direct compliance violations before consuming computationally denser resources.

> **Implementation note (v0):** the code model consumed by this layer is built by `src/analyzers/codeModel.js` — a regex/heuristic analyzer behind a stable interface. Swapping in a real AST parser (e.g., `@babel/parser`) is a planned upgrade that won't change the layer contracts.

- **AST analysis** — decomposes source code into syntactic nodes to identify dangerous function calls (e.g., dynamic code execution), permissive CORS configurations, or explicit SSL/TLS disabling.
- **Package-registry verification** — analyzes dependency manifest files and compares requested libraries against public package registries, flagging names suspicious of having been invented by language models.
- **Strict regular expressions** — searches for known signatures of private keys, cloud-service tokens, and structured credential formats.

## Layer 2: Probabilistic & Heuristic Analysis

Unlike the first layer, the probabilistic layer deals with uncertainty and statistical deviation. It hunts anomalies that don't necessarily match a fixed rule but have a high probability of representing a vulnerability.

- **Shannon entropy calculation** — evaluates the randomness of character sequences inside the code. Strings with high variation density and randomness are marked as potential credentials or keys missed by fixed patterns.
- **Code anomaly scoring** — evaluates block and function structure. Overly long functions, unusual async-promise stacking, or empty exception-handling chains raise the risk score of that specific snippet.
- **Heuristic flow analysis (taint estimation)** — statistically estimates whether variables sourced from user requests reach sensitive sinks (database calls, disk writes) without passing through visible sanitization steps.

> **Optional local models (Layer 2.5):** pluggable Hugging Face classifiers and embedding models (via `@xenova/transformers`, fully on-device) can enrich this layer — secret/PII detectors, injection classifiers, and code-similarity embeddings — selected per scan or per MCP tool call.

## Layer 3: Semantic Reasoning via LLM

Triggered primarily for snippets flagged by the previous layers or for user-configured deep scans. It uses language models — local via Ollama/vLLM or remote via API — to understand the code's real intent and context.

- **Business-logic flaw detection** — identifies whether an endpoint modifies data without verifying resource ownership (Insecure Direct Object Reference — IDOR).
- **Validation-bypass inspection** — evaluates whether defined access controls satisfy the expected security rule for the application's context.
- **False-positive mitigation** — uses contextual understanding to dismiss deterministic and probabilistic alerts that are harmless in practice.

## Severity Matrix

| Severity | Vulnerability Category | Risk Description | Primary Detection Layer |
| --- | --- | --- | --- |
| Critical | Exposed secrets / injection | Plain-text API keys or dynamic command execution without validation | Layer 1 (Deterministic) |
| Critical | Authorization bypass (IDOR) | Direct access to third-party data without permission checks in middleware | Layer 3 (Semantic LLM) |
| High | Hallucinated packages / slop | Inclusion of dependencies that don't exist in the official package registry | Layers 1 & 2 (integrated) |
| High | High-entropy strings | Keys or passwords encoded in non-standard formats | Layer 2 (Probabilistic) |
| Medium | Permissive CORS (`*`) | Cross-origin requests open to any origin on write APIs | Layer 1 (Deterministic) |
| Low | Stack-trace exposure | Error responses containing internal application details in production | Layer 3 (Semantic LLM) |

## Security & Privacy in the Audit

- **Code privacy** — when configured to use local LLMs (e.g., Ollama running code-focused models), no source-code snippet leaves the developer's environment.
- **Pre-send token sanitization** — if a cloud LLM provider is configured, VibeGuard automatically masks API keys, IP addresses, and personally identifiable information before sending a snippet for remote analysis.
- **Non-invasive execution** — scanning operates strictly in read-only mode and never modifies the project's original files without express user authorization.

## Test Scenarios

BDD scenarios covering this document live in [`features/`](../features/):

- [`deterministic-scan.feature`](../features/deterministic-scan.feature) — Layer 1 rules (secrets regex, AST, CORS, TLS, registry check)
- [`probabilistic-scan.feature`](../features/probabilistic-scan.feature) — Layer 2 (entropy, anomaly scoring, taint estimation)
- [`semantic-audit.feature`](../features/semantic-audit.feature) — Layer 3 (IDOR, validation bypass, false-positive dismissal)
- [`severity.feature`](../features/severity.feature) — severity matrix & classification
- [`privacy.feature`](../features/privacy.feature) — local-LLM privacy, sanitization, read-only execution
