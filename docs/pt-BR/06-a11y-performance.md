# 06 — Acessibilidade (A11y) e Performance

[English](../06-a11y-performance.md) · [Português](./06-a11y-performance.md)

Expandir o VibeGuard para validar acessibilidade (a11y) e performance — além de segurança — transforma a ferramenta em um **auditor completo de qualidade de código** para sistemas gerados por IA (vibecoded). Modelos de linguagem frequentemente cometem deslizes nessas frentes: esquecem atributos `aria-*` e tags semânticas, geram componentes React pesados sem otimização ou importam bibliotecas inteiras desnecessariamente.

Veja como essas novas frentes se integram às três camadas do sistema.

## Camada 1 — Análise Estática Determinística

Assim como varre chaves vazadas e vulnerabilidades, a camada determinística faz uma varredura rápida baseada em AST (Abstract Syntax Tree) e regras pré-definidas no código recém-gerado.

**Checagens de acessibilidade:**

- Imagens (`<img>`) sem o atributo `alt` obrigatório.
- Elementos interativos não-nativos (`<div>` / `<span>` com `onClick`) sem propriedades de acessibilidade adequadas (`role="button"`, `tabIndex={0}`).
- Contraste de cores estático em arquivos de estilização (Tailwind, CSS Modules) e hierarquia incorreta de títulos (ex.: `h1` pulando para `h4`).

**Checagens de performance:**

- Uso de imagens pesadas sem otimização — ex.: componentes `<img>` nativos em frameworks como Next.js em vez do componente otimizado `<Image/>`.
- Importações volumosas mal estruturadas — `import * as _ from 'lodash'` em vez de importar apenas a função necessária (o que incha o bundle gerado pela IA).
- Loops pesados ou renderizações desnecessárias em componentes front-end.

## Camada 2 — Heurísticas de Tamanho e Complexidade

- **Métrica de complexidade ciclomática** — identifica funções excessivamente longas ou ramificadas que a IA costuma gerar em um único bloco ("God Functions"), prejudicando a performance de execução e a manutenibilidade.
- **Peso de dependências** — analisa o `package.json` gerado por IA para calcular o impacto estimado no tamanho do pacote (bundle size) antes de permitir a instalação da dependência.

## Camada 3 — Auditoria Semântica de Lógica e Refatoração Automática

Quando a IA gera um código funcional, mas ineficiente ou inacessível estruturalmente, a camada semântica atua corrigindo o problema na raiz:

- **Explicação do impacto** — aponta o trecho e detalha o motivo pelo qual aquele código afeta usuários com deficiência (violando diretrizes WCAG) ou degrada o tempo de carregamento da aplicação (Core Web Vitals).
- **Geração automática do fix** — o motor de IA propõe o patch de código corrigido: substituindo tags genéricas por tags semânticas acessíveis ou aplicando técnicas de lazy loading em componentes pesados.

## CLI e Modo Contínuo

```bash
# Auditoria completa (segurança + acessibilidade + performance) no projeto atual
npx vibeguard check --all

# Modo contínuo focado apenas em acessibilidade e performance
npx vibeguard watch --focus a11y,performance

# Varredura histórica por débitos graves de performance ou acessibilidade
npx vibeguard audit-history --check-performance
```

Essa expansão garante que o código vibecodado não seja apenas seguro contra invasões e vazamentos, mas que também entregue uma experiência de alta performance e inclusiva para os usuários finais.

## Cenários de Teste

Cenários BDD cobrindo este documento estão em [`features/pt-BR/`](../../features/pt-BR/):

- [`a11y-performance.feature`](../../features/pt-BR/a11y-performance.feature) — checagens de a11y, checagens de performance, correções geradas por LLM
