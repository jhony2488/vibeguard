# language: pt
@privacy @security
Funcionalidade: Privacidade e auditoria não-invasiva
  Como um desenvolvedor auditando código proprietário
  Eu quero privacidade de código e garantias de somente-leitura
  Para que a análise nunca vaze ou modifique meu código-fonte

  @local-llm
  Cenário: LLM local mantém todo o código na máquina
    Dado que o VibeGuard está configurado com um LLM local (ex.: Ollama)
    Quando a camada semântica analisa um arquivo
    Então nenhum trecho de código-fonte sai do ambiente do desenvolvedor

  @sanitization @remote-llm
  Cenário: Sanitização pré-envio para provedores de LLM em nuvem
    Dado que o VibeGuard está configurado com um provedor de LLM remoto
    E um trecho sinalizado contém uma chave de API, um endereço IP e dados pessoais
    Quando o trecho é enviado para análise semântica remota
    Então segredos, endereços IP e dados pessoais são mascarados antes do envio

  @read-only
  Cenário: Varreduras nunca modificam arquivos do projeto
    Quando eu executo qualquer comando de varredura "vibeguard"
    Então os arquivos originais do projeto não são modificados
    E alterações só são aplicadas com autorização expressa do usuário

  @read-only @fix
  Cenário: Correções sugeridas exigem consentimento explícito
    Dado que a camada semântica gerou um patch corrigido
    Quando o patch é apresentado
    Então ele só é aplicado após aprovação explícita do usuário
