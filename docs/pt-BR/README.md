# Documentação do VibeGuard

[English](../README.md) · [Português (pt-BR)](./README.md)

Documentação de especificação e arquitetura do VibeGuard CLI — um auditor em camadas de segurança, acessibilidade e performance para código gerado por IA.

## Conteúdo

| Doc | Tema |
| --- | --- |
| [01 — Visão Geral](./01-overview.md) | O problema do código "vibecodado" e os objetivos do VibeGuard |
| [02 — Arquitetura](./02-architecture.md) | Motor de auditoria em 3 camadas, matriz de severidade, privacidade |
| [03 — CLI](./03-cli.md) | Comandos, flags, formatos de saída, UI do terminal |
| [04 — Servidor MCP](./04-mcp-server.md) | Tools do Model Context Protocol e integração com IDEs/agentes |
| [05 — Watch & Histórico](./05-watch-and-history.md) | Daemon de monitoramento contínuo e auditoria do histórico git |
| [06 — A11y & Performance](./06-a11y-performance.md) | Auditoria de acessibilidade e performance |

## Cenários de Teste BDD

Especificações executáveis (Gherkin) do comportamento descrito nestes docs estão em [`features/`](../../features/), com o espelho em português em [`features/pt-BR/`](../../features/pt-BR/). Cada doc referencia seus arquivos `.feature` correspondentes ao final.
