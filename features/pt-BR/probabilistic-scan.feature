# language: pt
@layer2 @probabilistic
Funcionalidade: Análise probabilística e heurística (Camada 2)
  Como um desenvolvedor auditando código gerado por IA
  Eu quero detecção estatística de anomalias além de regras fixas
  Para que vulnerabilidades sem assinatura conhecida também sejam capturadas

  Contexto:
    Dado um projeto contendo arquivos-fonte gerados por IA

  @high @secrets @entropy
  Cenário: Sinalizar string de alta entropia como provável segredo
    Dado que um arquivo contém a string "x9Kf2Qm7ZvLp3Rt8WnYc4Hs6BjD1Eg5U"
    E a string possui entropia de Shannon acima do limiar configurado
    Quando eu executo "vibeguard check"
    Então a varredura reporta um achado "High" da categoria "High-entropy string"

  @entropy
  Cenário: Strings de baixa entropia não são sinalizadas
    Dado que um arquivo contém a string "hello-world-welcome-message"
    E a string possui entropia de Shannon abaixo do limiar configurado
    Quando eu executo "vibeguard check"
    Então nenhum achado de "High-entropy string" é reportado para ela

  @complexity
  Cenário: Elevar a pontuação de risco de uma God Function
    Dado que um arquivo contém uma função com mais de 200 linhas e ramificação profunda
    Quando eu executo "vibeguard check"
    Então a pontuação de anomalia dessa função é elevada
    E o arquivo é marcado como candidato prioritário para a camada semântica

  @complexity
  Cenário: Sinalizar cadeia de tratamento de exceções vazia
    Dado que um arquivo contém um bloco "catch" com corpo vazio
    Quando eu executo "vibeguard check"
    Então a pontuação de anomalia desse bloco é elevada

  @taint
  Cenário: Estimar fluxo de dados inseguro até um sink de banco de dados
    Dado que um handler de rota lê um valor de "req.params.id"
    E o valor alcança uma query de banco de dados sem etapa de sanitização
    Quando eu executo "vibeguard check"
    Então a varredura reporta um fluxo de dados inseguro estimado
    E o arquivo é escalonado para análise semântica

  @taint
  Cenário: Fluxo sanitizado não é sinalizado como inseguro
    Dado que um handler de rota lê um valor de "req.body.email"
    E o valor passa por uma função de validação/sanitização
    Quando o valor alcança uma query de banco de dados
    Então nenhum achado de fluxo inseguro é reportado para esse caminho
