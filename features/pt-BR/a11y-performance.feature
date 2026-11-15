# language: pt
@a11y @performance
Funcionalidade: Auditoria de acessibilidade e performance
  Como um desenvolvedor entregando código front-end gerado por IA
  Eu quero verificações de a11y e performance junto à segurança
  Para que código vibecodado também seja inclusivo e rápido para os usuários finais

  @a11y @layer1
  Cenário: Imagem sem texto alternativo
    Dado que um arquivo contém "<img>" sem o atributo "alt"
    Quando eu executo "vibeguard check --all"
    Então um achado de "A11y" é reportado pelo texto alternativo ausente

  @a11y @layer1
  Cenário: Elemento interativo não-nativo sem propriedades de acessibilidade
    Dado que um arquivo contém uma "<div>" com "onClick" mas sem "role" ou "tabIndex"
    Quando eu executo "vibeguard check --all"
    Então um achado de "A11y" recomenda os atributos "role" e "tabIndex"

  @a11y @layer1
  Cenário: Hierarquia de títulos quebrada
    Dado que um arquivo pula de "h1" para "h4" sem níveis intermediários
    Quando eu executo "vibeguard check --all"
    Então um achado de "A11y" é reportado para a hierarquia de títulos

  @a11y @layer1
  Cenário: Violação estática de contraste de cores
    Dado que tokens de folha de estilo produzem contraste insuficiente para texto
    Quando eu executo "vibeguard check --all"
    Então um achado de "A11y" sinaliza o problema de contraste

  @performance @layer1
  Cenário: Imagem não otimizada em framework com otimização
    Dado que um componente Next.js usa um elemento "<img>" nativo
    Quando eu executo "vibeguard check --all"
    Então um achado de "PERFORMANCE" recomenda o componente otimizado "<Image/>"
    E o impacto no LCP (Largest Contentful Paint) é explicado

  @performance @layer1
  Cenário: Importação inchada de biblioteca
    Dado que um arquivo contém "import * as _ from 'lodash'"
    Quando eu executo "vibeguard check --all"
    Então um achado de "PERFORMANCE" recomenda importar apenas a função necessária
    E o impacto no tamanho do bundle é reportado

  @performance @layer2
  Cenário: God Function sinalizada por complexidade ciclomática
    Dado que um arquivo contém uma função excessivamente longa e ramificada
    Quando eu executo "vibeguard check --all"
    Então a métrica de complexidade a sinaliza como "God Function"
    E os impactos de manutenibilidade e execução são reportados

  @performance @layer2
  Cenário: Peso de dependência estimado antes da instalação
    Dado que um "package.json" gerado por IA adiciona uma nova dependência
    Quando a verificação de dependências roda
    Então o impacto estimado no bundle é calculado antes de permitir a instalação

  @a11y @layer3 @fix
  Cenário: Camada semântica propõe correção acessível
    Dado que um "<div onClick>" genérico foi sinalizado como controle inacessível
    Quando a camada semântica gera uma correção
    Então o patch o substitui por um elemento semântico acessível
    E a explicação referencia a diretriz WCAG violada

  @performance @layer3 @fix
  Cenário: Camada semântica propõe correção de performance
    Dado que um componente pesado foi sinalizado por custo de renderização
    Quando a camada semântica gera uma correção
    Então o patch aplica uma otimização como lazy loading
    E a explicação referencia a métrica de Core Web Vitals afetada
