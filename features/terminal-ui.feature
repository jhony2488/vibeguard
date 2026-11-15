@cli @terminal-ui
Feature: Interactive terminal experience
  As a developer running VibeGuard locally
  I want rich visual feedback in the terminal
  So that findings are scannable and actionable at a glance

  @progress
  Scenario: Live progress indicators per stage
    When I run "vibeguard check"
    Then a spinner is shown for each stage
    And each finished stage prints its elapsed time

  @progress
  Scenario Outline: Stages report their progress lines
    Given a scan is running the stage "<stage>"
    When the stage completes
    Then the terminal shows a completion line such as "<example>"

    Examples:
      | stage                    | example                                                       |
      | deterministic            | ✔ Deterministic scan complete (14ms)                          |
      | git history              | ✔ History verified: no exposed .env in the last 50 commits.   |
      | a11y + performance       | ✔ 2 performance issues and 1 accessibility issue found.       |

  @grouping
  Scenario: Findings are grouped by domain with severity colors
    Given a scan found issues in "SECURITY", "PERFORMANCE", and "A11y"
    When the report is rendered
    Then each finding is prefixed with its domain tag
    And colors map to severity: red for critical, yellow for warnings, blue for notices

  @detail
  Scenario: Each finding shows file, line, and recommendation
    Given a scan found a high-risk security issue in "src/auth.ts" at line 42
    When the report is rendered
    Then the finding shows "[SECURITY] High Risk (line 42 in src/auth.ts)"
    And a technical fix recommendation is displayed beneath it
