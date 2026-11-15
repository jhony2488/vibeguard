@history @git
Feature: Git-history audit
  As a developer adopting VibeGuard on an existing project
  I want to scan past commits for leaked secrets and hallucinated deps
  So that historical leaks are found and mitigated, not just current ones

  @onboarding
  Scenario: Interactive prompt offers the history scan
    When I run "vibeguard check" on a project with git history
    Then I am asked whether to map previous commits for exposed secrets
    And choosing "No" audits only the current state of the files

  @secrets
  Scenario Outline: Detect credentials committed in the past
    Given an old commit added "<pattern>"
    And the line was later removed from the current files
    When I run "vibeguard audit-history"
    Then the historical leak is reported even though it is no longer present

    Examples:
      | pattern                               |
      | an OpenAI-style key "sk-proj-..."     |
      | an AWS-style key "AKIA..."            |
      | a JWT token                           |
      | a "postgres://user:pass@host" string  |
      | a committed ".env" file               |

  @entropy
  Scenario: Entropy analysis catches variable-length tokens in history
    Given an old commit added a high-entropy string that matches no fixed signature
    When I run "vibeguard audit-history"
    Then the probabilistic entropy check flags it as a probable secret

  @dependencies
  Scenario: Detect hallucinated packages introduced by old commits
    Given an old commit added "react-quantum-hooks" to "package.json"
    And "react-quantum-hooks" does not exist in the npm registry
    When I run "vibeguard audit-history"
    Then a "Hallucinated package" finding is reported with the introducing commit

  @mitigation
  Scenario: Mitigation report for a historical leak
    Given a secret was found in a commit from two weeks ago
    When the audit-history report is generated
    Then the exact commit hash and affected lines are shown
    And history-rewrite commands are suggested ("git filter-repo" or BFG Repo-Cleaner)
    And a warning to revoke the key immediately is displayed

  @cli
  Scenario: Limit the historical scan depth
    When I run "vibeguard audit-history --commits 100"
    Then at most the last 100 commits are analyzed

  @cli @secrets
  Scenario: Secrets-focused historical scan
    When I run "vibeguard audit-history --detect-secrets"
    Then only leaked .env files and credentials are searched

  @a11y-performance
  Scenario: Historical scan for performance and accessibility debt
    When I run "vibeguard audit-history --check-performance"
    Then commits introducing severe performance/accessibility debt are reported
