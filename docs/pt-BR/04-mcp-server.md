# 04 — Integração via Servidor MCP

[English](../04-mcp-server.md) · [Português](./04-mcp-server.md)

O **Model Context Protocol (MCP)**, criado pela Anthropic, permite expor capacidades de análise local do VibeGuard diretamente para assistentes como Claude Desktop e Cursor, ou agentes como o Devin.

## Arquitetura de Integração

O VibeGuard opera como um assistente de análise de segurança que pode ser consumido em três níveis:

```text
┌────────────────────────────────────────────────────────┐
│               Clientes & Interfaces                    │
│  [VS Code / Cursor]      [Devin / Agentes]    [CLI]    │
└───────────┬──────────────────────┬───────────────┬─────┘
            │ (JSON-RPC / stdio)   │ (MCP Server)  │ (Process)
            ▼                      ▼               ▼
┌────────────────────────────────────────────────────────┐
│          VibeGuard Core Protocol Server                │
│  • Motor Determinístico (Regex / AST / Rules)          │
│  • Motor Probabilístico (Entropy / Heuristics)         │
│  • Motor Semântico (LLM Security Auditor)              │
└────────────────────────────────────────────────────────┘
```

## Tools Expostas pelo Servidor MCP

### `vibeguard_scan_file`

- **Parâmetros:** `filePath: string`, `depth?: 'fast' | 'full'`
- **Função:** executa a verificação determinística e probabilística em tempo real em um arquivo específico.

### `vibeguard_scan_project`

- **Parâmetros:** `directory: string`, `ignorePatterns?: string[]`
- **Função:** executa o scanner no projeto inteiro antes de um commit ou deploy.

### `vibeguard_audit_diff`

- **Parâmetros:** `gitDiff: string`
- **Função:** focada em agentes como Devin ou Cursor Agent — analisa apenas as alterações recém-geradas pela IA antes de aprovar a gravação no disco.

### `vibeguard_explain_issue`

- **Parâmetros:** `ruleId: string`, `codeSnippet: string`
- **Função:** chama a camada semântica (LLM) para explicar por que aquele padrão "vibecodado" é um risco de segurança e gera o fix correto.

## Integração por Ferramenta / IDE

### A. Cursor e Devin (via MCP)

Basta adicionar o servidor MCP no arquivo de configuração do ambiente (`mcp.json` ou nas configurações do Cursor):

```json
{
  "mcpServers": {
    "vibeguard": {
      "command": "npx",
      "args": ["-y", "@vibeguard/mcp-server"],
      "env": {
        "VIBEGUARD_LLM_KEY": "sua-chave-api"
      }
    }
  }
}
```

**Comportamento no agente:** quando a IA gera um código rápido (vibecoded), ela chama automaticamente a ferramenta `vibeguard_audit_diff` para auditar a própria geração. Se o VibeGuard acusar erro de severidade alta (ex.: chave exposta ou dependência alucinada), o próprio agente corrige a falha antes de entregar a tarefa.

### B. VS Code (extensão dedicada)

A integração ocorre em duas frentes:

- **LSP / Diagnostics** — conforme o desenvolvedor (ou a IA de preenchimento automático como o Copilot) digita no editor, a camada determinística e probabilística do VibeGuard roda em background e marca as linhas com sublinhados vermelho/amarelo no painel de Problems.
- **Quick Fixes (Code Actions)** — ao clicar na lâmpada sobre um problema identificado, a camada probabilística/LLM oferece a opção **"VibeGuard: Fix VibeCoding Security Flaw"**.

### C. Hooks de Git (pre-commit / pre-push)

Mesmo fora das IDEs, o sistema pode ser acionado de forma automatizada usando ferramentas como Husky:

```bash
npx vibeguard check --staged --strict
```

## Benefícios

- **Prevenção na origem** — em vez de descobrir erros de código "vibecodado" na etapa de testes ou produção, o agente de IA ajusta o código em tempo de geração.
- **Desempenho otimizado**:
  - *Camada determinística/probabilística* roda instantaneamente no cliente/IDE (<20ms) para bloquear falhas óbvias.
  - *Camada semântica (LLM)* é invocada via MCP somente quando há ambiguidade ou necessidade de reestruturação lógica complexa.
- **Interoperabilidade total** — ao suportar o padrão MCP, o VibeGuard passa a ser compatível com Cursor, Devin, Claude Desktop, Windsurf e qualquer novo agente ou ambiente que adote a especificação da Anthropic.

## Cenários de Teste

Cenários BDD cobrindo este documento estão em [`features/pt-BR/`](../../features/pt-BR/):

- [`mcp-server.feature`](../../features/pt-BR/mcp-server.feature) — tools MCP, loop de auto-auditoria do agente, configuração via `mcp.json`
