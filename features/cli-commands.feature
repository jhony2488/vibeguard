@cli @commands
Feature: CLI commands and output modes
  As a developer or CI pipeline
  I want granular commands, flags, and output formats
  So that audits fit local, CI/CD, and reporting workflows

  @check
  Scenario: Default scan audits the current directory
    When I run "vibeguard check"
    Then the project is audited with the configured analysis layers
    And results are displayed in the interactive terminal

  @check @deep
  Scenario: Deep audit forces the LLM semantic pass
    When I run "vibeguard check --deep"
    Then priority files are sent through the semantic layer
    And full syntactic and semantic analysis is performed

  @check @deps
  Scenario: Dependency-focused scan
    When I run "vibeguard check --deps"
    Then only the dependency tree is scanned
    And phantom or hallucinated packages are reported

  @check @all
  Scenario: Combined audit across all domains
    When I run "vibeguard check --all"
    Then security, accessibility, and performance checks all run

  @check @focus
  Scenario: Scoped audit on specific domains
    When I run "vibeguard check --focus=perf,a11y"
    Then only performance and accessibility checks run

  @check @history
  Scenario: History-only scan
    When I run "vibeguard check --history-only"
    Then only the git-history and leaked-secrets scan runs

  @check @staged @ci
  Scenario: Strict scan of staged changes for CI
    When I run "vibeguard check --staged --strict"
    Then only staged changes are audited
    And the run fails when blocking-severity findings exist

  @output @interactive
  Scenario: Interactive mode lets the user act on each finding
    Given a scan produced findings
    When I run "vibeguard check --interactive"
    Then each finding offers to fix it now, ignore it, or view details

  @output @json
  Scenario: JSON output for CI consumption
    When I run "vibeguard check --format json"
    Then a structured JSON report is printed
    And findings include file, line, severity, and recommendation

  @output @sarif
  Scenario: SARIF output for security tooling
    When I run "vibeguard check --format sarif"
    Then a SARIF-compliant report is produced

  @output @report
  Scenario: Static report file generation
    When I run "vibeguard check --report"
    Then a static report file "vibeguard-report.html" is generated
    And it summarizes the security, performance, and accessibility posture
