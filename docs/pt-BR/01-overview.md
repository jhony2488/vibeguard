# 01 — Visão Geral e Contexto

[English](../01-overview.md) · [Português](./01-overview.md)

## 1. O Fenômeno do Código "Vibecodado"

O avanço do desenvolvimento assistido por Inteligência Artificial generativa popularizou a prática do desenvolvimento acelerado por linguagem natural, frequentemente denominado **"vibecoding"**. Embora essa abordagem aumente substancialmente a velocidade de entrega de funcionalidades, ela introduz um padrão de risco estrutural: a inserção maciça de código sem revisão humana minuciosa.

Sistemas vibecodados tendem a apresentar padrões característicos de vulnerabilidade, tais como:

- **Bibliotecas redundantes ou alucinadas** — propensas a ataques de typosquatting ou alucinação de pacotes (dependency confusion).
- **Atalhos de autenticação e autorização** — criados para contornar bloqueios durante prototipagens e esquecidos em ambientes produtivos.
- **Segredos e credenciais expostos** — decorrentes de exemplos fornecidos pelos modelos e mantidos no código-fonte final.
- **Lógica de negócios permissiva** — onde rotas de API assumem premissas de confiança em parâmetros enviados pelo cliente.

## 2. Objetivo do VibeGuard CLI

O VibeGuard CLI é uma ferramenta em linha de comando desenvolvida em Node.js projetada para **inspecionar, classificar e reportar falhas de segurança** em projetos criados via IA. Ele atua como um portão de checagem automatizado, combinando técnicas determinísticas de alta velocidade com análises estatísticas e inteligência semântica contextualizada.

Além da segurança, o VibeGuard audita **acessibilidade (a11y)** e **performance** — frentes em que modelos de linguagem frequentemente cometem deslizes (atributos `aria-*` ausentes, tags não-semânticas, componentes não otimizados, importações inchadas). Veja [06 — A11y & Performance](./06-a11y-performance.md).

## Próximo

- [02 — Arquitetura](./02-architecture.md)
- Especificações executáveis (Gherkin): [`features/pt-BR/`](../../features/pt-BR/)
