# language: pt
@layer1 @deterministic
Funcionalidade: Análise estática determinística (Camada 1)
  Como um desenvolvedor auditando código gerado por IA
  Eu quero regras estritas de ultra-baixa latência para capturar violações óbvias
  Para que falhas comuns de vibecoding sejam filtradas antes de análises mais densas

  Contexto:
    Dado um projeto contendo arquivos-fonte gerados por IA

  @critical @secrets
  Esquema do Cenário: Detectar credenciais hardcoded via assinaturas regex
    Dado que o arquivo "<file>" contém "<snippet>"
    Quando eu executo "vibeguard check"
    Então a varredura reporta um achado "Critical" da categoria "Exposed secret"
    E o achado aponta para "<file>" na linha <line>
    E a recomendação diz para mover o valor para uma variável de ambiente

    Exemplos:
      | file        | snippet                              | line |
      | src/auth.ts | const key = "sk-proj-abc123..."      | 42   |
      | config.js   | AWS_KEY = "AKIAIOSFODNN7EXAMPLE"     | 7    |
      | db.ts       | url = "postgres://user:pass@host/db" | 3    |

  @critical @injection
  Cenário: Detectar execução dinâmica de código sobre entrada do usuário
    Dado que um arquivo chama "eval()" sobre um valor derivado de um parâmetro de requisição
    Quando eu executo "vibeguard check"
    Então a varredura reporta um achado "Critical" da categoria "Injection"

  @medium @cors
  Cenário: Detectar CORS permissivo em uma API de escrita
    Dado que uma rota de API habilita CORS com origem "*"
    E a rota aceita operações de escrita
    Quando eu executo "vibeguard check"
    Então a varredura reporta um achado "Medium" da categoria "Permissive CORS"

  @tls
  Cenário: Detectar desativação explícita de SSL/TLS
    Dado que um arquivo define "NODE_TLS_REJECT_UNAUTHORIZED=0" ou flag equivalente
    Quando eu executo "vibeguard check"
    Então a varredura reporta um achado referenciando desativação de TLS

  @high @dependencies
  Cenário: Detectar dependência alucinada no manifesto
    Dado que o "package.json" declara a dependência "express-rate-limitter-ultra"
    E "express-rate-limitter-ultra" não existe no registro público do npm
    Quando eu executo "vibeguard check --deps"
    Então a varredura reporta um achado "High" da categoria "Hallucinated package"
    E o relatório alerta sobre risco de typosquatting e dependency confusion

  @dependencies
  Cenário: Dependências existentes passam na verificação do registro
    Dado que o "package.json" declara apenas dependências existentes no registro npm
    Quando eu executo "vibeguard check --deps"
    Então nenhum achado de "Hallucinated package" é reportado

  @performance
  Cenário: Checagem determinística por arquivo respeita o orçamento de latência
    Quando um único arquivo é analisado pela camada determinística
    Então a análise é concluída em até 20 milissegundos
