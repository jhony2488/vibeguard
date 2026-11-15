# language: pt
@cli @terminal-ui
Funcionalidade: Experiência interativa no terminal
  Como um desenvolvedor rodando o VibeGuard localmente
  Eu quero feedback visual rico no terminal
  Para que os achados sejam legíveis e acionáveis rapidamente

  @progress
  Cenário: Indicadores de progresso em tempo real por etapa
    Quando eu executo "vibeguard check"
    Então um spinner é exibido para cada etapa
    E cada etapa concluída imprime seu tempo decorrido

  @progress
  Esquema do Cenário: Etapas reportam suas linhas de progresso
    Dado que uma varredura está executando a etapa "<stage>"
    Quando a etapa é concluída
    Então o terminal exibe uma linha de conclusão como "<example>"

    Exemplos:
      | stage                  | example                                                           |
      | determinística         | ✔ Varredura determinística concluída (14ms)                       |
      | histórico git          | ✔ Histórico verificado: nenhum .env exposto nos últimos 50 commits.|
      | a11y + performance     | ✔ 2 problemas de performance e 1 de acessibilidade encontrados.   |

  @grouping
  Cenário: Achados agrupados por domínio com cores por severidade
    Dado que uma varredura encontrou problemas em "SECURITY", "PERFORMANCE" e "A11y"
    Quando o relatório é renderizado
    Então cada achado é prefixado com sua tag de domínio
    E as cores mapeiam a severidade: vermelho para crítico, amarelo para avisos, azul para avisos informativos

  @detail
  Cenário: Cada achado exibe arquivo, linha e recomendação
    Dado que uma varredura encontrou um problema de segurança de alto risco em "src/auth.ts" na linha 42
    Quando o relatório é renderizado
    Então o achado exibe "[SECURITY] High Risk (linha 42 em src/auth.ts)"
    E uma recomendação técnica de correção é exibida abaixo dele
