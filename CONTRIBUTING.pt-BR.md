# Contribuindo com o VibeGuard

[English](./CONTRIBUTING.md) · [Português](./CONTRIBUTING.pt-BR.md)

Obrigado por ajudar a construir o VibeGuard — um auditor de segurança, acessibilidade e performance para código gerado por IA. Este guia cobre como configurar seu ambiente e as regras que toda contribuição segue.

## Formas de Contribuir

- **Bug reports e pedidos de features** — abra uma issue descrevendo o padrão de vibecoding ou o comportamento de auditoria que você tem em mente.
- **Documentação** — correções e melhorias em `docs/` (veja *Docs são a fonte da verdade* abaixo).
- **Cenários de teste** — novos cenários Gherkin em `features/` descrevendo comportamento antes de ele existir.
- **Código** — bug fixes e features em `src/`, sempre vinculados à spec.

## Setup de Desenvolvimento

Requisitos: **Node.js ≥ 18.18** (projeto ESM; o Jest roda via `--experimental-vm-modules`).

```bash
npm install
npx husky   # obrigatório — o .npmrc define ignore-scripts=true, então o `prepare` não roda sozinho
```

| Comando | Função |
| --- | --- |
| `npm test` | Suite completa do Jest (unit + integration) |
| `npm run test:unit` | Apenas testes unitários (`__tests__/unit`) |
| `npm run test:integration` | Apenas testes de integração (`__tests__/integration`) |
| `npm run lint` | ESLint no repositório |
| `npm run lint:fix` | ESLint com autofix |
| `npm run format` | Prettier write |
| `npm run format:check` | Verificação do Prettier (sem escrita) |

> O `.npmrc` traz configurações de segurança (`min-release-age=7`, `ignore-scripts=true`, `allow-git=none`). Não enfraqueça nem contorne — se uma dependência nova falhar no gate de idade de release, fixe uma versão mais antiga.

## Docs são a Fonte da Verdade

O diretório `docs/` define o comportamento esperado; o código o implementa. **Todo PR que muda comportamento precisa atualizar a documentação**, e os docs são bilíngues:

- `docs/*.md` — canônico, em inglês
- `docs/pt-BR/*.md` — espelho em português, mesmos nomes de arquivo e estrutura
- `features/*.feature` — cenários Gherkin (inglês)
- `features/pt-BR/*.feature` — espelho em português (header `# language: pt`, keywords `Funcionalidade`/`Cenário`/`Dado`/`Quando`/`Então`)

Mantenha as duas árvores sincronizadas no mesmo PR. Todo doc começa com uma linha de alternância de idioma apontando para a contraparte. Veja `AGENTS.md` para as convenções completas de docs/testes.

## Regras de Pull Request

- **≤ 20 arquivos alterados por PR.** PRs maiores só são aceitos com uma justificativa válida na descrição (ex.: renomeação mecânica, arquivos gerados, ou sincronização do espelho de docs). Revisores ainda podem pedir para dividir.
- **Um assunto por PR** — não misture uma feature com refactors ou sweeps de formatação não relacionados.
- **Draft PRs são bem-vindos** para feedback antecipado; marque como pronto quando o checklist abaixo estiver verde.
- Hooks são guardas locais — os checks de CI são a autoridade final e precisam passar antes do merge.

## Convenções de Commit

Commits usam prefixos no estilo Conventional Commits:

| Prefixo | Uso |
| --- | --- |
| `feat:` | Novo comportamento visível ao usuário |
| `fix:` / `bugfix:` | Correção de bugs |
| `test:` / `tests:` | Adição ou alteração apenas de testes |
| `docs:` | Documentação e mudanças de spec em `.feature` |
| `refactor:` | Reestruturação sem mudança de comportamento |
| `perf:` | Melhorias de performance |
| `style:` | Apenas formatação/espaços |
| `chore:` | Tooling, dependências, build |
| `ci:` | Configuração de CI |
| `build:` | Sistema de build ou empacotamento |
| `revert:` | Reversão de commit anterior |

Escopo opcional é permitido — `feat(mcp): serve skills via SEP-2640`. Escreva o assunto no imperativo, ≤72 caracteres, ex.: `fix: ignore .env symlinks in scanProject`.

## Commits Assinados (obrigatório)

Todos os commits **precisam ser assinados via SSH**. Configure uma vez:

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub   # sua chave pública
git config --global commit.gpgsign true
```

Depois suba a mesma chave pública no GitHub → *Settings → SSH and GPG keys → New SSH key → Key type: Signing Key*, para que os commits apareçam como **Verified**.

PRs com commits não assinados serão devolvidos para re-assinatura (`git rebase --signoff`/`git commit --amend -S`) antes da revisão.

## Estilo de Código & Tooling

| Ferramenta | Config | Enforcement |
| --- | --- | --- |
| ESLint 9 | `eslint.config.js` (flat config, ESM + Node + Jest globals) | hook `pre-commit` → `npm run lint` |
| Prettier | `.prettierrc.json` | `npm run format` / `format:check` |
| Husky | `.husky/` | `pre-commit` → lint · `pre-push` → `npm test` |

Rode `npm run lint` e `npm run format` antes de fazer push. Siga o estilo de código existente — veja `AGENTS.md` e os arquivos vizinhos em caso de dúvida.

## Convenções de Teste

- Jest (ESM) — testes ficam em `__tests__/unit/` e `__tests__/integration/`.
- Spec-first: todo teste carrega um comentário `// features/<file>.feature — "<cenário>"` rastreando-o até a spec Gherkin.
- Testes unitários isolam módulos via mocks injetados (`__tests__/helpers/`); testes de integração cobrem fluxos multi-módulo (projeto fixture, repo git real em tmp, CLI spawnado).

## Checklist do PR

- [ ] `npm run lint` e `npm test` passam localmente
- [ ] Mudanças de comportamento estão documentadas — `docs/` EN **e** `docs/pt-BR/` atualizados
- [ ] Cenários de spec atualizados — `features/` EN **e** `features/pt-BR/`
- [ ] Commits seguem as convenções de prefixo e estão assinados via SSH
- [ ] ≤ 20 arquivos alterados — ou justificativa incluída na descrição do PR
- [ ] Novos testes carregam o comentário de rastreabilidade `// features/... — "cenário"`
