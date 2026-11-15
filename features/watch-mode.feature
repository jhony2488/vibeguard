@watch @daemon
Feature: Continuous monitoring (watch mode)
  As a developer pairing with AI assistants
  I want VibeGuard to watch the filesystem in the background
  So that newly generated code is audited in real time without blocking me

  Background:
    Given VibeGuard watch mode is running in the project directory

  @watcher
  Scenario: File changes trigger an incremental audit
    When a source file is modified in the project
    Then the changed file is queued for analysis

  @watcher @ignores
  Scenario Outline: Ignored paths never trigger an audit
    When a file under "<path>" changes
    Then no audit is triggered for that change

    Examples:
      | path                     |
      | node_modules/            |
      | .git/                    |
      | dist/                    |
      | a .gitignore'd file      |
      | a .vibeguardignore'd file|

  @debounce
  Scenario: Rapid successive saves collapse into one audit
    Given a file is saved repeatedly every 500 milliseconds
    When a pause of the configured debounce (1000ms) is detected
    Then a single audit runs for the accumulated changes
    And CPU usage stays within the expected budget

  @escalation
  Scenario: Deterministic + probabilistic layers run first on changed files
    When a source file changes
    Then layers 1 and 2 run on the changed file within 15 milliseconds

  @escalation @threshold
  Scenario: High risk probability escalates to the semantic layer
    Given layers 1 and 2 raised the risk probability above the configured threshold
    When a file change is audited
    Then the semantic (LLM) layer is triggered for that file

  @escalation @critical-files
  Scenario Outline: Changes to critical files escalate automatically
    When the file "<file>" changes
    Then the semantic (LLM) layer is triggered

    Examples:
      | file                 |
      | .env                 |
      | src/routes/api.ts    |
      | src/middleware/auth.ts |

  @notify
  Scenario: Severe finding fires a native OS notification
    Given watch mode was started with "--notify"
    When a critical finding is detected in a changed file
    Then a native OS notification is dispatched
    And the terminal dashboard highlights the finding

  @cli
  Scenario: Watch with custom path, debounce, and severity filter
    When I run "vibeguard watch --path ./src --debounce 1000 --min-severity high"
    Then only "./src" is watched
    And the debounce window is 1000ms
    And only findings at or above "high" severity are surfaced
