# language: pt
@mcp @integration
Funcionalidade: Tools do servidor MCP e integração com agentes
  Como um agente de IA ou IDE conectado via Model Context Protocol
  Eu quero as análises do VibeGuard expostas como tools MCP
  Para que a saída vibecodada seja auditada em tempo de geração

  Contexto:
    Dado que o VibeGuard está rodando como um servidor MCP
    E o cliente está conectado via JSON-RPC sobre stdio

  @tools
  Esquema do Cenário: Servidor expõe as tools documentadas
    Quando o cliente lista as tools disponíveis
    Então a tool "<tool>" está disponível
    E ela aceita os parâmetros "<params>"

    Exemplos:
      | tool                          | params                                     |
      | vibeguard_scan_file           | filePath, depth? ('fast' ou 'full')        |
      | vibeguard_scan_project        | directory, ignorePatterns?                 |
      | vibeguard_audit_diff          | gitDiff                                    |
      | vibeguard_explain_issue       | ruleId, codeSnippet                        |
      | vibeguard_start_watch         | (escopo de sessão)                         |
      | vibeguard_audit_git_history   | caminho do repositório / faixa de commits  |

  @tools @scan-file
  Cenário: Escanear um arquivo em profundidade fast
    Quando o cliente chama "vibeguard_scan_file" com filePath "src/auth.ts" e depth "fast"
    Então as camadas determinística e probabilística rodam naquele arquivo
    E os achados são retornados ao cliente em tempo real

  @tools @scan-project
  Cenário: Escanear o projeto inteiro antes de um commit
    Quando o cliente chama "vibeguard_scan_project" com directory "." e ignorePatterns ["dist/**"]
    Então o projeto é analisado excluindo os padrões ignorados

  @tools @audit-diff @agent-loop
  Cenário: Agente auto-audita o código recém-gerado
    Dado que um agente gerou uma alteração de código
    Quando o agente chama "vibeguard_audit_diff" com o git diff gerado
    Então apenas as linhas alteradas são auditadas
    E o resultado é retornado antes da gravação no disco

  @tools @audit-diff @agent-loop
  Cenário: Agente corrige achado de severidade alta antes de entregar
    Dado que "vibeguard_audit_diff" reportou um problema de severidade "High" no diff
    Quando o agente recebe o resultado
    Então o agente corrige a falha na própria saída antes de concluir a tarefa

  @tools @explain
  Cenário: Explicar um padrão sinalizado via camada semântica
    Quando o cliente chama "vibeguard_explain_issue" com ruleId "VG-SEC-001" e um trecho de código
    Então a camada semântica explica por que o padrão é um risco de segurança
    E retorna um patch de código corrigido

  @config
  Cenário: Servidor configurado via mcp.json
    Dada uma configuração de ambiente declarando o servidor MCP "vibeguard"
    E ele roda com command "npx" e args "-y @vibeguard/mcp-server"
    E env contém "VIBEGUARD_LLM_KEY"
    Quando o cliente inicia a sessão
    Então as tools MCP do VibeGuard ficam disponíveis para o agente

  @skills @sep-2640
  Cenário: Servidor declara a extensão de skills
    Quando o cliente inspeciona as capabilities do servidor
    Então a extensão "io.modelcontextprotocol/skills" está declarada
    E a capability "resources" está presente

  @skills @sep-2640
  Esquema do Cenário: Servidor enumera as skills servidas
    Quando o cliente chama "skills/list"
    Então a skill "<skill>" está listada
    E sua entrada carrega o frontmatter do SKILL.md e um manifesto de resources

    Exemplos:
      | skill                   |
      | fix-vibecoding-flaws    |
      | secure-review-checklist |

  @skills @sep-2640
  Cenário: Agente carrega o playbook de remediação após um finding
    Dado que "vibeguard_audit_diff" reportou um finding com ruleId "VG-SEC-001"
    Quando o agente lê "skill://fix-vibecoding-flaws/rules/VG-SEC-001.md" via "resources/read"
    Então a reescrita segura e os passos de verificação do playbook estão disponíveis
    E o agente re-executa a auditoria para confirmar a correção

  @skills @sep-2640
  Cenário: Navegar nos arquivos de apoio de uma skill
    Dado que o servidor declarou suporte a "directoryRead"
    Quando o cliente chama "resources/directory/read" em "skill://fix-vibecoding-flaws/rules"
    Então os arquivos de playbook são listados como resources
