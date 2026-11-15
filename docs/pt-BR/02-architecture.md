# 02 — Arquitetura em Camadas de Auditoria

[English](../02-architecture.md) · [Português](./02-architecture.md)

Para proporcionar rápida execução sem comprometer a profundidade da análise, o sistema utiliza uma abordagem de **Defesa em Profundidade** dividida em três camadas sequenciais e complementares.

```text
        [ Diretório do Projeto / Código-Fonte ]
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ CAMADA 1: Análise Determinística                         │
│ • Parsing de AST (Árvore de Sintaxe Abstrata)            │
│ • Reconhecimento de Padrões Fixo e Expressões Regulares  │
│ • Verificação de Existência de Pacotes no Registro       │
└───────────────────────────┬──────────────────────────────┘
                            │ (execução em milissegundos)
                            ▼
┌──────────────────────────────────────────────────────────┐
│ CAMADA 2: Análise Probabilística e Heurística            │
│ • Cálculo de Entropia de Shannon (busca de segredos)     │
│ • Análise estatística de complexidade e estrutura        │
│ • Mapeamento estimativo de fluxo de dados inseguros      │
└───────────────────────────┬──────────────────────────────┘
                            │ (execução condicional/filtrada)
                            ▼
┌──────────────────────────────────────────────────────────┐
│ CAMADA 3: Raciocínio Semântico via LLM                   │
│ • Avaliação contextual da lógica de negócios             │
│ • Detecção de falhas de autorização (IDOR)               │
│ • Validação de intenção e casos de borda complexos       │
└──────────────────────────────────────────────────────────┘
```

## Camada 1: Análise Determinística

A primeira camada é focada na execução de regras estritas, imutáveis e de ultra-baixa latência. Seu objetivo é filtrar problemas óbvios e violadores diretos de conformidade antes de consumir recursos computacionalmente mais densos.

- **Análise da Árvore de Sintaxe Abstrata (AST)** — a ferramenta decompõe o código-fonte em nós sintáticos para identificar chamadas de funções perigosas (como execução dinâmica de código), configurações permissivas de CORS ou desativação explícita de SSL/TLS.
- **Verificação de pacotes no registro** — analisa arquivos de manifesto de dependências e compara as bibliotecas solicitadas com os registros públicos de pacotes, identificando nomes suspeitos de terem sido inventados pelos modelos de linguagem.
- **Expressões regulares rigorosas** — busca por assinaturas conhecidas de chaves privadas, tokens de serviços de nuvem e formatos estruturados de credenciais.

## Camada 2: Análise Probabilística e Heurística

Diferente da primeira camada, a camada probabilística lida com incertezas e desvios de padrão estatístico. Ela busca por anomalias que não correspondem necessariamente a uma regra fixa, mas que possuem alta probabilidade de representar uma vulnerabilidade.

- **Cálculo de Entropia de Shannon** — avalia a aleatoriedade de sequências de caracteres dentro do código. Strings com alta densidade de variação e aleatoriedade são marcadas como potenciais credenciais ou chaves não identificadas por padrões fixos.
- **Pontuação de anomalia de código** — avalia a estrutura de blocos e funções. Funções excessivamente longas, empilhamento incomum de promessas assíncronas ou cadeias de tratamento de exceções vazias sobem a pontuação de risco daquele trecho específico.
- **Análise heurística de fluxo (taint estimation)** — estima estatisticamente se variáveis vindas de requisições de usuários alcançam pontos sensíveis (como chamadas de banco de dados ou escrita em disco) sem passarem por etapas visíveis de sanitização.

## Camada 3: Raciocínio Semântico via LLM

A terceira camada é acionada prioritariamente para trechos sinalizados pelas camadas anteriores ou para varreduras profundas configuradas pelo usuário. Ela utiliza modelos de linguagem (locais via Ollama/vLLM ou remotos via API) para compreender a real intenção e o contexto do código.

- **Detecção de falhas de lógica de negócios** — identifica se um endpoint realiza modificações de dados sem verificar a propriedade do recurso (Insecure Direct Object Reference — IDOR).
- **Inspeção de contornos de validação** — avalia se os controles de acesso definidos satisfazem a regra de segurança esperada para o contexto da aplicação.
- **Mitigação de falsos positivos** — utiliza o entendimento de contexto para descartar alertas levantados pelas camadas determinística e probabilística que sejam inofensivos na prática.

## Matriz de Severidade

| Severidade | Categoria de Vulnerabilidade | Descrição do Risco | Camada Principal de Detecção |
| --- | --- | --- | --- |
| Crítica | Segredos expostos / injeção | Chaves de API em texto claro ou execução dinâmica de comandos sem validação | Camada 1 (Determinística) |
| Crítica | Bypass de autorização (IDOR) | Acesso direto a dados de terceiros sem checagem de permissão no middleware | Camada 3 (LLM Semântica) |
| Alta | Pacotes alucinados / slop | Inclusão de dependências inexistentes no registro oficial de pacotes | Camadas 1 & 2 (Integrada) |
| Alta | Alta entropia em strings | Presença de chaves ou senhas codificadas em formato não padrão | Camada 2 (Probabilística) |
| Média | CORS permissivo (`*`) | Abertura de requisições cruzadas para qualquer origem em APIs de escrita | Camada 1 (Determinística) |
| Baixa | Exposição de stack trace | Respostas de erro contendo detalhes internos da aplicação em produção | Camada 3 (LLM Semântica) |

## Segurança e Privacidade na Auditoria

- **Privacidade de código** — quando configurado para utilizar LLMs locais (como Ollama rodando modelos focados em código), nenhum trecho de código-fonte sai do ambiente do desenvolvedor.
- **Sanitização de tokens pré-envio** — caso seja configurado um provedor de LLM em nuvem, o VibeGuard mascara automaticamente chaves de API, endereços IP e dados pessoais identificáveis antes de enviar o trecho para análise remota.
- **Execução não-invasiva** — a varredura opera estritamente em modo de leitura, sem alterar os arquivos originais do projeto sem a autorização expressa do usuário.

## Cenários de Teste

Cenários BDD cobrindo este documento estão em [`features/pt-BR/`](../../features/pt-BR/):

- [`deterministic-scan.feature`](../../features/pt-BR/deterministic-scan.feature) — regras da Camada 1 (regex de segredos, AST, CORS, TLS, registro de pacotes)
- [`probabilistic-scan.feature`](../../features/pt-BR/probabilistic-scan.feature) — Camada 2 (entropia, pontuação de anomalia, taint estimation)
- [`semantic-audit.feature`](../../features/pt-BR/semantic-audit.feature) — Camada 3 (IDOR, contorno de validação, descarte de falsos positivos)
- [`severity.feature`](../../features/pt-BR/severity.feature) — matriz e classificação de severidade
- [`privacy.feature`](../../features/pt-BR/privacy.feature) — privacidade com LLM local, sanitização, execução somente-leitura
