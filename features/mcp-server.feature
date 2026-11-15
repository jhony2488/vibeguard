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
    And it runs with command "npx" and args "-y @vibeguard/mcp-server"
    And env contains "VIBEGUARD_LLM_KEY"
    When the client starts the session
    Then the VibeGuard MCP tools become available to the agent
