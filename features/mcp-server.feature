@mcp @integration
Feature: MCP server tools and agent integration
  As an AI agent or IDE connected via the Model Context Protocol
  I want VibeGuard's analysis exposed as MCP tools
  So that vibecoded output is audited at generation time

  Background:
    Given VibeGuard is running as an MCP server
    And the client is connected via JSON-RPC over stdio

  @tools
  Scenario Outline: Server exposes the documented tools
    When the client lists the available tools
    Then the tool "<tool>" is available
    And it accepts parameters "<params>"

    Examples:
      | tool                          | params                                     |
      | vibeguard_scan_file           | filePath, depth? ('fast' or 'full')        |
      | vibeguard_scan_project        | directory, ignorePatterns?                 |
      | vibeguard_audit_diff          | gitDiff                                    |
      | vibeguard_explain_issue       | ruleId, codeSnippet                        |
      | vibeguard_start_watch         | (session-scoped)                           |
      | vibeguard_audit_git_history   | repository path / commit range             |

  @tools @scan-file
  Scenario: Scan a single file in fast depth
    When the client calls "vibeguard_scan_file" with filePath "src/auth.ts" and depth "fast"
    Then the deterministic and probabilistic layers run on that file
    And findings are returned to the client in real time

  @tools @scan-project
  Scenario: Scan a whole project before a commit
    When the client calls "vibeguard_scan_project" with directory "." and ignorePatterns ["dist/**"]
    Then the project is scanned excluding the ignored patterns

  @tools @audit-diff @agent-loop
  Scenario: Agent self-audits freshly generated code
    Given an agent generated a code change
    When the agent calls "vibeguard_audit_diff" with the generated git diff
    Then only the changed lines are audited
    And the result is returned before the change is written to disk

  @tools @audit-diff @agent-loop
  Scenario: Agent fixes a high-severity finding before delivering
    Given "vibeguard_audit_diff" reported a "High" severity issue in the diff
    When the agent receives the result
    Then the agent corrects the flaw in its own output before finishing the task

  @tools @explain
  Scenario: Explain a flagged pattern via the semantic layer
    When the client calls "vibeguard_explain_issue" with ruleId "VG-SEC-001" and a code snippet
    Then the semantic layer explains why the pattern is a security risk
    And returns a corrected code patch

  @config
  Scenario: Server is configured through mcp.json
    Given an environment config declaring the "vibeguard" MCP server
    And it runs with command "vibeguard" and args "mcp"
    And env contains "VIBEGUARD_LLM_KEY"
    When the client starts the session
    Then the VibeGuard MCP tools become available to the agent

  @models @per-call
  Scenario: Agent selects the LLM model per tool call
    Given the project context suggests a code-tuned model
    When the agent calls "vibeguard_scan_file" with "model" and "llmUrl" params
    Then the scan uses that OpenAI-compatible endpoint for the semantic pass
    And the response lists it under "modelsUsed.llm"

  @models @per-call @classifier
  Scenario: Agent attaches a local classifier per tool call
    When the agent calls "vibeguard_scan_file" with "classifierModel" and "classifierTask"
    Then the probabilistic layer includes findings from that local model
    And the response lists it under "modelsUsed.classifier"

  @skills @sep-2640
  Scenario: Server declares the skills extension
    When the client inspects the server capabilities
    Then the "io.modelcontextprotocol/skills" extension is declared
    And the "resources" capability is present

  @skills @sep-2640
  Scenario Outline: Server enumerates served skills
    When the client calls "skills/list"
    Then the skill "<skill>" is listed
    And its entry carries the SKILL.md frontmatter and a resources manifest

    Examples:
      | skill                   |
      | fix-vibecoding-flaws    |
      | secure-review-checklist |

  @skills @sep-2640
  Scenario: Agent loads a remediation playbook after a finding
    Given "vibeguard_audit_diff" reported a finding with ruleId "VG-SEC-001"
    When the agent reads "skill://fix-vibecoding-flaws/rules/VG-SEC-001.md" via "resources/read"
    Then the playbook's secure rewrite and verification steps are available
    And the agent re-runs the audit to confirm the fix

  @skills @sep-2640
  Scenario: Browse a skill's supporting files
    Given the server declared "directoryRead" support
    When the client calls "resources/directory/read" on "skill://fix-vibecoding-flaws/rules"
    Then the playbook files are listed as resources
