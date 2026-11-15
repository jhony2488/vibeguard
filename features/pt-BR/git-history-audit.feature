# language: pt
@history @git
Funcionalidade: Auditoria do histórico Git
  Como um desenvolvedor adotando o VibeGuard em um projeto existente
  Eu quero varrer commits passados em busca de segredos vazados e dependências alucinadas
  Para que vazamentos históricos sejam encontrados e mitigados, não apenas os atuais

  @onboarding
  Cenário: Prompt interativo oferece a varredura de histórico
    Quando eu executo "vibeguard check" em um projeto com histórico git
    Então sou perguntado se desejo mapear commits anteriores por segredos expostos
    E ao escolher "Não", apenas o estado atual dos arquivos é auditado

  @secrets
  Esquema do Cenário: Detectar credenciais commitadas no passado
    Dado que um commit antigo adicionou "<pattern>"
    E a linha foi posteriormente removida dos arquivos atuais
    Quando eu executo "vibeguard audit-history"
    Então o vazamento histórico é reportado mesmo não estando mais presente

    Exemplos:
      | pattern                               |
      | uma chave estilo OpenAI "sk-proj-..." |
      | uma chave estilo AWS "AKIA..."        |
      | um token JWT                          |
      | uma string "postgres://user:pass@host"|
      | um arquivo ".env" commitado           |

  @entropy
  Cenário: Análise de entropia captura tokens de tamanho variável no histórico
    Dado que um commit antigo adicionou uma string de alta entropia sem assinatura fixa
    Quando eu executo "vibeguard audit-history"
    Então a verificação probabilística de entropia a sinaliza como provável segredo

  @dependencies
  Cenário: Detectar pacotes alucinados introduzidos por commits antigos
    Dado que um commit antigo adicionou "react-quantum-hooks" ao "package.json"
    E "react-quantum-hooks" não existe no registro npm
    Quando eu executo "vibeguard audit-history"
    Então um achado de "Hallucinated package" é reportado com o commit que o introduziu

  @mitigation
  Cenário: Relatório de mitigação para vazamento histórico
    Dado que um segredo foi encontrado em um commit de duas semanas atrás
    Quando o relatório de audit-history é gerado
    Então o hash exato do commit e as linhas afetadas são exibidos
    E comandos de reescrita de histórico são sugeridos ("git filter-repo" ou BFG Repo-Cleaner)
    E um alerta para revogar a chave imediatamente é exibido

  @cli
  Cenário: Limitar a profundidade da varredura histórica
    Quando eu executo "vibeguard audit-history --commits 100"
    Então no máximo os últimos 100 commits são analisados

  @cli @secrets
  Cenário: Varredura histórica focada em segredos
    Quando eu executo "vibeguard audit-history --detect-secrets"
    Então apenas arquivos .env vazados e credenciais são pesquisados

  @a11y-performance
  Cenário: Varredura histórica de débitos de performance e acessibilidade
    Quando eu executo "vibeguard audit-history --check-performance"
    Então commits que introduziram débitos graves de performance/acessibilidade são reportados
