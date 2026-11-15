# language: pt
@watch @daemon
Funcionalidade: Monitoramento contínuo (modo watch)
  Como um desenvolvedor trabalhando com assistentes de IA
  Eu quero que o VibeGuard observe o sistema de arquivos em background
  Para que código recém-gerado seja auditado em tempo real sem me bloquear

  Contexto:
    Dado que o modo watch do VibeGuard está rodando no diretório do projeto

  @watcher
  Cenário: Alterações de arquivo disparam auditoria incremental
    Quando um arquivo-fonte é modificado no projeto
    Então o arquivo alterado entra na fila de análise

  @watcher @ignores
  Esquema do Cenário: Caminhos ignorados nunca disparam auditoria
    Quando um arquivo sob "<path>" é alterado
    Então nenhuma auditoria é disparada para essa alteração

    Exemplos:
      | path                          |
      | node_modules/                 |
      | .git/                         |
      | dist/                         |
      | arquivo coberto por .gitignore      |
      | arquivo coberto por .vibeguardignore|

  @debounce
  Cenário: Salvamentos rápidos sucessivos colapsam em uma única auditoria
    Dado que um arquivo é salvo repetidamente a cada 500 milissegundos
    Quando uma pausa do debounce configurado (1000ms) é detectada
    Então uma única auditoria roda para as mudanças acumuladas
    E o uso de CPU permanece dentro do orçamento esperado

  @escalation
  Cenário: Camadas determinística + probabilística rodam primeiro nos arquivos alterados
    Quando um arquivo-fonte é alterado
    Então as camadas 1 e 2 rodam no arquivo alterado em até 15 milissegundos

  @escalation @threshold
  Cenário: Probabilidade de risco alta escala para a camada semântica
    Dado que as camadas 1 e 2 elevaram a probabilidade de risco acima do limiar configurado
    Quando uma alteração de arquivo é auditada
    Então a camada semântica (LLM) é acionada para esse arquivo

  @escalation @critical-files
  Esquema do Cenário: Alterações em arquivos críticos escalam automaticamente
    Quando o arquivo "<file>" é alterado
    Então a camada semântica (LLM) é acionada

    Exemplos:
      | file                   |
      | .env                   |
      | src/routes/api.ts      |
      | src/middleware/auth.ts |

  @notify
  Cenário: Achado grave dispara notificação nativa do SO
    Dado que o modo watch foi iniciado com "--notify"
    Quando um achado crítico é detectado em um arquivo alterado
    Então uma notificação nativa do SO é disparada
    E o dashboard do terminal destaca o achado

  @cli
  Cenário: Watch com path, debounce e filtro de severidade customizados
    Quando eu executo "vibeguard watch --path ./src --debounce 1000 --min-severity high"
    Então apenas "./src" é monitorado
    E a janela de debounce é de 1000ms
    E apenas achados de severidade "high" ou superior são exibidos
