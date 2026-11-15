# language: pt
@severity @classification
Funcionalidade: Classificação de severidade dos achados
  Os achados são classificados por severidade para que usuários e pipelines
  de CI possam priorizar correções e impor portões mínimos de qualidade.

  Esquema do Cenário: Achados são mapeados para a severidade documentada
    Dado que uma varredura detecta "<finding>" via "<layer>"
    Quando o relatório é gerado
    Então o achado é classificado como "<severity>"

    Exemplos:
      | finding                                      | layer                        | severity |
      | Chave de API em texto claro                  | Camada 1 (Determinística)    | Critical |
      | Execução dinâmica de comandos sem validação  | Camada 1 (Determinística)    | Critical |
      | Bypass de autorização (IDOR)                 | Camada 3 (LLM Semântica)     | Critical |
      | Dependência inexistente no registro          | Camadas 1 & 2 (integrada)    | High     |
      | String de alta entropia (chave/senha)        | Camada 2 (Probabilística)    | High     |
      | CORS permissivo (*) em API de escrita        | Camada 1 (Determinística)    | Medium   |
      | Exposição de stack trace em produção         | Camada 3 (LLM Semântica)     | Low      |

  Cenário: Relatório agrupa achados por domínio e severidade
    Dado que uma varredura produziu achados em "SECURITY", "PERFORMANCE" e "A11y"
    Quando o relatório é exibido
    Então os achados são agrupados por domínio
    E as severidades seguem código de cores: crítico/alto em vermelho, avisos em amarelo, avisos informativos em azul

  @ci @gate
  Cenário: Modo strict falha a execução com severidades bloqueantes
    Dado que uma varredura produziu ao menos um achado "High" ou "Critical"
    Quando eu executo "vibeguard check --staged --strict"
    Então o comando sai com status diferente de zero

  @ci @gate
  Cenário: Modo strict passa em projeto limpo
    Dado que uma varredura não produziu achados no nível bloqueante ou acima
    Quando eu executo "vibeguard check --staged --strict"
    Então o comando sai com status zero
