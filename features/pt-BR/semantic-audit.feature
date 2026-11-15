# language: pt
@layer3 @semantic @llm
Funcionalidade: Raciocínio semântico via LLM (Camada 3)
  Como um desenvolvedor auditando código gerado por IA
  Eu quero análise contextual da lógica de negócios
  Para que falhas de autorização e problemas de intenção sejam detectados
  e alertas determinísticos/probabilísticos inofensivos sejam descartados

  @critical @idor
  Cenário: Detectar bypass de autorização (IDOR)
    Dado que um endpoint "GET /api/orders/:id" retorna um pedido por id
    E o handler não verifica se o pedido pertence ao chamador
    Quando a camada semântica audita o arquivo
    Então um achado "Critical" da categoria "Authorization bypass (IDOR)" é reportado
    E a explicação descreve a checagem de propriedade ausente

  @authorization
  Cenário: Detectar contorno de validação no controle de acesso
    Dada uma rota admin protegida apenas por uma flag "isAdmin" enviada pelo cliente
    Quando a camada semântica audita o arquivo
    Então um achado reporta que o controle de acesso não satisfaz a regra esperada

  @false-positive
  Cenário: Descartar alerta determinístico inofensivo usando contexto
    Dado que a camada determinística sinalizou "Permissive CORS" em um endpoint público de leitura
    Quando a camada semântica revisa o achado
    Então o achado é rebaixado ou descartado como inofensivo para aquele contexto

  @false-positive
  Cenário: Manter achado real após revisão semântica
    Dado que a camada determinística sinalizou uma chave privada em um arquivo-fonte
    Quando a camada semântica revisa o achado
    Então a severidade "Critical" é confirmada

  @triggering
  Cenário: Camada semântica roda apenas em arquivos sinalizados ou em deep scan
    Dado um arquivo sem achados determinísticos ou probabilísticos
    Quando eu executo "vibeguard check" no modo padrão
    Então a camada semântica não é invocada para esse arquivo

  @triggering @deep
  Cenário: Deep scan força a passagem semântica em arquivos prioritários
    Quando eu executo "vibeguard check --deep"
    Então arquivos prioritários são enviados à camada semântica para análise completa

  @explain
  Cenário: Explicar um padrão sinalizado e gerar o fix
    Dado que um arquivo foi sinalizado por uma camada anterior
    Quando a camada semântica explica o problema
    Então a saída descreve por que o padrão é um risco de segurança
    E propõe um patch de código corrigido
