# language: pt
@cli @commands
Funcionalidade: Comandos da CLI e modos de saída
  Como um desenvolvedor ou pipeline de CI
  Eu quero comandos, flags e formatos de saída granulares
  Para que auditorias se encaixem em fluxos locais, de CI/CD e de relatórios

  @check
  Cenário: Varredura padrão audita o diretório atual
    Quando eu executo "vibeguard check"
    Então o projeto é auditado com as camadas de análise configuradas
    E os resultados são exibidos no terminal interativo

  @check @deep
  Cenário: Auditoria profunda força a passagem semântica via LLM
    Quando eu executo "vibeguard check --deep"
    Então arquivos prioritários passam pela camada semântica
    E análise sintática e semântica completa é realizada

  @check @deps
  Cenário: Varredura focada em dependências
    Quando eu executo "vibeguard check --deps"
    Então apenas a árvore de dependências é analisada
    E pacotes fantasma ou alucinados são reportados

  @check @all
  Cenário: Auditoria combinada em todos os domínios
    Quando eu executo "vibeguard check --all"
    Então verificações de segurança, acessibilidade e performance são executadas

  @check @focus
  Cenário: Auditoria com escopo em domínios específicos
    Quando eu executo "vibeguard check --focus=perf,a11y"
    Então apenas verificações de performance e acessibilidade são executadas

  @check @history
  Cenário: Varredura apenas do histórico
    Quando eu executo "vibeguard check --history-only"
    Então apenas a varredura de histórico git e segredos vazados é executada

  @check @staged @ci
  Cenário: Varredura strict das mudanças em staging para CI
    Quando eu executo "vibeguard check --staged --strict"
    Então apenas as mudanças em staging são auditadas
    E a execução falha quando existem achados de severidade bloqueante

  @output @interactive
  Cenário: Modo interativo permite agir sobre cada achado
    Dado que uma varredura produziu achados
    Quando eu executo "vibeguard check --interactive"
    Então cada achado oferece corrigir agora, ignorar ou ver detalhes

  @output @json
  Cenário: Saída JSON para consumo por CI
    Quando eu executo "vibeguard check --format json"
    Então um relatório JSON estruturado é impresso
    E os achados incluem arquivo, linha, severidade e recomendação

  @output @sarif
  Cenário: Saída SARIF para ferramentas de segurança
    Quando eu executo "vibeguard check --format sarif"
    Então um relatório compatível com SARIF é produzido

  @output @report
  Cenário: Geração de arquivo de relatório estático
    Quando eu executo "vibeguard check --report"
    Então um arquivo estático "vibeguard-report.html" é gerado
    E ele sumariza o panorama de segurança, performance e acessibilidade

  @llm @config
  Cenário: Configurar um provedor LLM para a camada semântica
    Quando eu executo "vibeguard check --deep --llm-url http://localhost:11434 --llm-model codellama"
    Então a camada semântica usa o endpoint compatível com OpenAI configurado
    E provedores remotos recebem apenas snippets sanitizados

  @classifier @local-models
  Cenário: Anexar um classificador local do Hugging Face
    Quando eu executo "vibeguard check --classifier-model secret-detector --classifier-task token-classification"
    Então a camada probabilística inclui achados do modelo local
    E "--no-classifier" desativa-o completamente

  @mcp @stdio
  Cenário: CLI global funciona também como servidor MCP
    Quando eu executo "vibeguard mcp"
    Então o processo serve JSON-RPC sobre stdio
    E clientes MCP podem chamar as tools vibeguard_* e ler resources skill://
