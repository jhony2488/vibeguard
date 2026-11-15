# 03 — Referência da CLI e UI do Terminal

[English](../03-cli.md) · [Português](./03-cli.md)

## Comandos

| Comando                             | Descrição                                                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `vibeguard check`                   | Varredura geral — inicia a auditoria no diretório atual (ou em um caminho específico) com as camadas configuradas      |
| `vibeguard check --deep`            | Auditoria profunda — força a passagem de arquivos prioritários pela camada de LLM para análise semântica completa      |
| `vibeguard check --deps`            | Varredura focada em dependências — mitiga riscos de pacotes fantasma ou alucinados                                     |
| `vibeguard check --all`             | Auditoria combinada — segurança + acessibilidade + performance                                                         |
| `vibeguard check --focus=perf,a11y` | Auditoria com escopo em domínios específicos                                                                           |
| `vibeguard check --history-only`    | Apenas a varredura de histórico git e segredos vazados                                                                 |
| `vibeguard check --staged --strict` | Modo CI/pre-commit sobre as mudanças em staging                                                                        |
| `vibeguard watch`                   | Daemon de monitoramento contínuo — veja [05 — Watch & Histórico](./05-watch-and-history.md)                            |
| `vibeguard audit-history`           | Varredura histórica de commits — veja [05 — Watch & Histórico](./05-watch-and-history.md)                              |
| `vibeguard mcp`                     | Expõe o VibeGuard como servidor MCP via stdio (tools + Skills Servidas) — veja [04 — Servidor MCP](./04-mcp-server.md) |

## Modo Servidor MCP (`vibeguard mcp`)

O mesmo binário global funciona como servidor MCP — `npm i -g vibeguard-cli` e aponte qualquer cliente MCP para `vibeguard mcp`. O processo fala JSON-RPC 2.0 delimitado por linha sobre stdio (stdout é só protocolo) e expõe as tools `vibeguard_*` mais as Skills Servidas da SEP-2640 sob URIs `skill://`. A configuração de modelos do servidor usa as mesmas variáveis de ambiente do CLI (`VIBEGUARD_LLM_*`, `VIBEGUARD_CLASSIFIER_*`) — veja [04 — Servidor MCP](./04-mcp-server.md) para a superfície completa do protocolo e as receitas por cliente.

## Formatos de Saída

O sistema disponibiliza múltiplos formatos para integração com diferentes fluxos de desenvolvimento:

- **Terminal interativo** — exibição com destaque de cores por severidade (Crítico, Alto, Médio, Baixo), indicando arquivo, linha e recomendação técnica de correção.
- **Relatórios estruturados JSON / SARIF** — formato padrão para consumo por pipelines de Integração Contínua (CI/CD) e integração com ferramentas de segurança corporativas.
- **Relatório HTML / Markdown** (`--report`) — gera um arquivo estático (ex.: `vibeguard-report.html`) detalhando o panorama de segurança, performance e acessibilidade do projeto para ser compartilhado com gerentes ou auditores.

## Modos de Saída

| Flag                     | Modo                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `--interactive` (padrão) | Abre prompts no terminal permitindo corrigir o erro na hora, ignorar o aviso ou abrir detalhes                     |
| `--format json`          | Saída legível por máquina para pipelines — o build pode falhar caso o score de segurança fique abaixo do aceitável |
| `--report`               | Gera um arquivo de relatório estático para compartilhamento                                                        |

## Configuração de LLM e Modelos Locais

A camada semântica do VibeGuard (Camada 3) e os classificadores locais opcionais (Camada 2.5) são plugáveis — nenhum modelo é obrigatório para o scan padrão.

### Provedor LLM (qualquer API compatível com OpenAI)

O cliente HTTP fala **Chat Completions** compatível com OpenAI (`POST {url}/v1/chat/completions`) — uma única configuração cobre servidores locais e APIs remotas:

| Provedor                               | Exemplo de `--llm-url`   | Chave               |
| -------------------------------------- | ------------------------ | ------------------- |
| Ollama                                 | `http://localhost:11434` | —                   |
| LM Studio                              | `http://localhost:1234`  | —                   |
| vLLM / servidor llama.cpp              | `http://seu-host:8000`   | —                   |
| OpenAI                                 | `https://api.openai.com` | `VIBEGUARD_LLM_KEY` |
| Groq / OpenRouter / Mistral / DeepSeek | URL base do provedor     | chave do provedor   |

```bash
# Modelo local — nada sai da máquina
npx vibeguard check --deep --llm-url http://localhost:11434 --llm-model codellama

# Provedor remoto — snippets são sanitizados (segredos/IPs/PII mascarados) antes do envio
npx vibeguard check --deep \
  --llm-url https://api.openai.com \
  --llm-model gpt-4o-mini \
  --llm-key "$VIBEGUARD_LLM_KEY"
```

| Origem  | Variáveis                                                                                                                                     |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Flags   | `--llm-url`, `--llm-model`, `--llm-key`                                                                                                       |
| Env     | `VIBEGUARD_LLM_URL`, `VIBEGUARD_LLM_MODEL`, `VIBEGUARD_LLM_KEY` (fallbacks: `OPENAI_BASE_URL`/`OPENAI_API_KEY`/`OPENAI_MODEL`, `OLLAMA_HOST`) |
| Arquivo | `.vibeguardrc` (JSON) no projeto ou no home: `{ "llm": { "url": "...", "model": "...", "apiKey": "..." } }`                                   |

Precedência: **flag > env > arquivo rc**. Prefira variáveis de ambiente ou o rc em vez de `--llm-key` — argv fica visível em listagens de processos. URLs locais (localhost, `127.*`, `::1`, RFC1918, `.local`) são detectadas automaticamente: provedores remotos recebem snippets sanitizados; locais recebem o código bruto.

### Classificadores e embeddings locais (opcional)

Modelos leves do Hugging Face podem rodar **totalmente no dispositivo** via [`@xenova/transformers`](https://github.com/xenova/transformers.js) — útil para detecção "semântica" sem nenhum LLM:

```bash
npm install @xenova/transformers

npx vibeguard check \
  --classifier-model <hf-model-id> \
  --classifier-task text-classification   # ou token-classification / feature-extraction
```

- `--classifier-model` (env `VIBEGUARD_CLASSIFIER_MODEL`) — qualquer id de modelo HF que o transformers.js consiga carregar (detectores de segredos/PII, classificadores de prompt-injection, modelos de embedding de código para varreduras por similaridade).
- `--classifier-task` (env `VIBEGUARD_CLASSIFIER_TASK`) — padrão `text-classification`.
- `--no-classifier` — força a desativação.

Os findings do classificador entram na camada probabilística como `Classifier: <label>`. No servidor MCP, agentes podem passar `model`/`llmUrl`/`classifierModel`/`classifierTask` **por chamada de tool** — o agente escolhe o modelo certo para o contexto do projeto (veja [04 — Servidor MCP](./04-mcp-server.md)).

## Experiência Visual no Terminal

Em vez de devolver um JSON críptico ou um bloco gigante de texto, o modo CLI utiliza bibliotecas modernas de formatação de terminal (chalk, ora, cli-table3, ink/enquirer) para estruturar o relatório em blocos visuais amigáveis.

### Indicadores de progresso em tempo real

```text
⠋ Executando varredura determinística (AST & Regex)...
✔ Varredura determinística concluída (14ms)
⠋ Analisando histórico de commits do Git...
✔ Histórico verificado: nenhum .env exposto nos últimos 50 commits.
⠋ Avaliando acessibilidade (A11y) e performance...
✔ 2 problemas de performance e 1 de acessibilidade encontrados.
```

### Resultados agrupados por domínio e severidade

```text
┌────────────────────────────────────────────────────────────────────┐
│ 🚨 VibeGuard Audit Report — 3 Issues Found                         │
└────────────────────────────────────────────────────────────────────┘

  [SECURITY] High Risk (linha 42 em src/auth.ts)
  └── Chave secreta de API detectada (possível exposição de token).
      Sugestão: mova para uma variável de ambiente em .env.

  [PERFORMANCE] Warning (linha 12 em src/components/Hero.tsx)
  └── Uso de <img> nativo em vez do componente otimizado <Image/>.
      Impacto: aumento do LCP (Largest Contentful Paint).

  [A11y] Notice (linha 28 em src/components/Button.tsx)
  └── Elemento interativo sem texto descritivo ou aria-label adequado.
```

### Exemplos de invocação

```bash
# Auditoria completa (segurança + a11y + performance) no projeto atual
npx vibeguard check --all

# Varredura apenas do histórico e de segredos vazados no Git
npx vibeguard check --history-only

# Focado estritamente em performance e acessibilidade
npx vibeguard check --focus=perf,a11y

# Monitoramento contínuo com debounce customizado + notificações do SO
npx vibeguard watch --debounce=500 --notify
```

Dessa forma, o CLI funciona como uma ferramenta de linha de comando robusta e independente, oferecendo feedback visual imediato e rico para o desenvolvedor antes mesmo de o código passar pelas mãos de um agente de IA ou ir para um repositório remoto.

## Cenários de Teste

Cenários BDD cobrindo este documento estão em [`features/pt-BR/`](../../features/pt-BR/):

- [`cli-commands.feature`](../../features/pt-BR/cli-commands.feature) — flags do `check`, modo staged/strict, formatos de saída
- [`terminal-ui.feature`](../../features/pt-BR/terminal-ui.feature) — indicadores de progresso, agrupamento de achados, cores por severidade
