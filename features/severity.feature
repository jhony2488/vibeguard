@severity @classification
Feature: Severity classification of findings
  Findings are classified by severity so that users and CI pipelines
  can prioritize fixes and enforce minimum-quality gates.

  Scenario Outline: Findings map to their documented severity
    Given a scan detects "<finding>" via "<layer>"
    When the report is generated
    Then the finding is classified as "<severity>"

    Examples:
      | finding                                      | layer                        | severity |
      | Plain-text API key                           | Layer 1 (Deterministic)      | Critical |
      | Dynamic command execution without validation | Layer 1 (Deterministic)      | Critical |
      | Authorization bypass (IDOR)                  | Layer 3 (Semantic LLM)       | Critical |
      | Dependency missing from the package registry | Layers 1 & 2 (integrated)    | High     |
      | High-entropy string (encoded key/password)   | Layer 2 (Probabilistic)      | High     |
      | Permissive CORS (*) on a write API           | Layer 1 (Deterministic)      | Medium   |
      | Stack-trace exposure in production errors    | Layer 3 (Semantic LLM)       | Low      |

  Scenario: Report groups findings by domain and severity
    Given a scan produced findings in "SECURITY", "PERFORMANCE", and "A11y"
    When the report is displayed
    Then findings are grouped by domain
    And severities are color-coded: Critical/High red, warnings yellow, notices blue

  @ci @gate
  Scenario: Strict mode fails the run on disallowed severities
    Given a scan produced at least one "High" or "Critical" finding
    When I run "vibeguard check --staged --strict"
    Then the command exits with a non-zero status

  @ci @gate
  Scenario: Strict mode passes on a clean project
    Given a scan produced no findings at or above the blocking threshold
    When I run "vibeguard check --staged --strict"
    Then the command exits with status zero
