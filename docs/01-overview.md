# 01 — Overview & Context

[English](./01-overview.md) · [Português](./pt-BR/01-overview.md)

## 1. The "Vibecoded" Code Phenomenon

The rise of generative-AI-assisted development popularized rapid natural-language development — commonly called **vibecoding**. While this approach substantially increases feature-delivery speed, it introduces a structural risk pattern: massive insertion of code without thorough human review.

Vibecoded systems tend to exhibit characteristic vulnerability patterns:

- **Redundant or hallucinated dependencies** — prone to typosquatting or package-hallucination attacks (dependency confusion).
- **Authentication and authorization shortcuts** — created to bypass blockers during prototyping and forgotten in production environments.
- **Exposed secrets and credentials** — carried over from model-provided examples and kept in the final source code.
- **Permissive business logic** — API routes that assume trust in client-supplied parameters.

## 2. VibeGuard's Goal

VibeGuard CLI is a Node.js command-line tool designed to **inspect, classify, and report security flaws** in AI-built projects. It acts as an automated check gate, combining high-speed deterministic techniques with statistical analysis and context-aware semantic intelligence.

Beyond security, VibeGuard audits **accessibility (a11y)** and **performance** — areas where language models frequently slip (missing `aria-*` attributes, non-semantic markup, unoptimized components, bloated imports). See [06 — A11y & Performance](./06-a11y-performance.md).

## Next

- [02 — Architecture](./02-architecture.md)
- Executable specifications (Gherkin): [`features/`](../features/)
