# 05 — Modo Watch e Auditoria de Histórico

[English](../05-watch-and-history.md) · [Português](./05-watch-and-history.md)

## Monitoramento Contínuo em Tempo Real (`watch` / daemon)

O modo contínuo permite que o VibeGuard rode no terminal de segundo plano como um daemon local, escutando alterações no sistema de arquivos do projeto em tempo real (file watcher) sem travar o fluxo de trabalho.

### Funcionamento técnico

1. **Watcher de baixo impacto (chokidar / fs.watch)**
   - Escuta criação, modificação ou renomeação de arquivos no diretório do projeto.
   - Filtra automaticamente diretórios como `node_modules`, `.git`, `dist` e arquivos declarados no `.gitignore` ou `.vibeguardignore`.

2. **Fila de análise com debounce (buffer de execução)**
   - Quando uma IA ou desenvolvedor faz edições contínuas (ex.: salvando arquivos a cada 500ms), o VibeGuard aguarda uma pausa configurável (ex.: 1000ms) para disparar a auditoria, evitando uso excessivo de CPU.

3. **Pipeline de escalonamento de camadas (incremental)**
   - **Passo 1 (imediato):** executa apenas a camada determinística + probabilística nos arquivos alterados (<15ms).
   - **Passo 2 (sob demanda / threshold):** se a probabilidade de risco atingir um limiar configurado — ou houver alteração em arquivos críticos (`.env`, rotas de API, middlewares de autenticação) — o CLI aciona a camada semântica (LLM).

4. **Notificações nativas e dashboard no terminal**
   - Exibe um painel dinâmico no terminal (estilo TUI/CLI interativo).
   - Caso encontre um problema grave (ex.: uma chave secreta inserida pelo Copilot/Cursor), pode disparar uma notificação nativa no sistema operacional (macOS, Windows, Linux).

### CLI

```bash
# Inicia o monitoramento contínuo do projeto atual
npx vibeguard watch

# Monitoramento com filtro de severidade e delay customizado
npx vibeguard watch --path ./src --debounce 1000 --min-severity high
```

## Auditoria Histórica de Commits (`audit-history`)

Antes de iniciar o monitoramento contínuo — ou ao executar o CLI pela primeira vez em um projeto existente — o VibeGuard pode realizar uma varredura histórica da árvore do Git.

### Fluxo interativo do CLI (onboarding)

```text
? Deseja realizar um mapeamento do histórico de commits anteriores do Git antes de iniciar?
❯ [S] Sim — mapear histórico de commits em busca de segredos/chaves expostas (.env)
  [N] Não — auditar apenas o estado atual dos arquivos
```

### O que o mapeamento de commits analisa

- **Varredura de histórico (`git log -p` / AST diffing)** — analisa não apenas o cabeçalho (HEAD), mas todas as alterações salvas em commits passados (mesmo as que já foram sobrescritas ou deletadas no código atual).
- **Detecção de `.env` e credenciais históricas** — procura por chaves de API (`sk-proj-...`, `AKIA...`), tokens JWT, strings de conexão com bancos de dados (`postgres://...`) ou variáveis de ambiente que foram commitadas por engano no passado.
- **Verificação probabilística de entropia** — analisa a aleatoriedade de strings adicionadas no histórico para pegar tokens de tamanho variável que a regex não pegaria.
- **Auditoria de código alucinado / vibecodado** — identifica se commits antigos introduziram pacotes npm ou PyPI inexistentes/alucinados (vulneráveis a dependency confusion / typosquatting).
- **Relatório de mitigação** — se um segredo for encontrado em um commit de duas semanas atrás, o VibeGuard exibe o hash exato do commit, as linhas afetadas, sugere comandos para remover a chave da história do Git (como `git filter-repo` ou BFG Repo-Cleaner) e alerta para revogar a chave imediatamente.

### CLI

```bash
# Executa a auditoria completa nos últimos 100 commits (ou na árvore inteira)
npx vibeguard audit-history --commits 100

# Executa focado estritamente na detecção de vazamentos de .env e segredos
npx vibeguard audit-history --detect-secrets
```

## Tools MCP

Se o VibeGuard estiver rodando como um Servidor MCP conectado ao Cursor ou Devin, essas capacidades ficam disponíveis como novas tools:

- **`vibeguard_start_watch`** — ativa o monitoramento em background durante a sessão de pareamento do agente de IA.
- **`vibeguard_audit_git_history`** — permite que o próprio agente (ex.: Devin) faça uma varredura no histórico de commits do repositório para certificar que nada confidencial foi vazado antes de criar um Pull Request.

## Resumo do Fluxo

```text
[ Início: npx vibeguard ]
           │
           ▼
[ Prompt interativo: deseja auditar histórico do Git? ]
     ├── (Sim) ➔ [ Varredura de commits: .env, chaves e pacotes alucinados antigos ]
     └── (Não) ➔ [ Pula para o estado atual ]
           │
           ▼
[ Auditoria completa das 3 camadas (Determinística + Probabilística + LLM) ]
           │
           ▼
[ Pergunta: manter o projeto sob monitoramento contínuo (watch)? ]
     └── (Sim) ➔ [ File watcher em background + notificações instantâneas de segurança ]
```

## Cenários de Teste

Cenários BDD cobrindo este documento estão em [`features/pt-BR/`](../../features/pt-BR/):

- [`watch-mode.feature`](../../features/pt-BR/watch-mode.feature) — file watcher, filtros de ignore, debounce, escalonamento de camadas, notificações do SO
- [`git-history-audit.feature`](../../features/pt-BR/git-history-audit.feature) — prompt interativo, segredos históricos, relatório de mitigação
