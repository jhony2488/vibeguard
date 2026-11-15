@layer1 @deterministic
Feature: Deterministic static analysis (Layer 1)
  As a developer auditing AI-generated code
  I want strict, ultra-low-latency rules to catch obvious violations
  So that common vibecoding flaws are filtered before denser analysis runs

  Background:
    Given a project containing AI-generated source files

  @critical @secrets
  Scenario Outline: Detect hardcoded credentials via regex signatures
    Given a file "<file>" contains "<snippet>"
    When I run "vibeguard check"
    Then the scan reports a "Critical" finding of category "Exposed secret"
    And the finding points to "<file>" at line <line>
    And the recommendation says to move the value to an environment variable

    Examples:
      | file        | snippet                              | line |
      | src/auth.ts | const key = "sk-proj-abc123..."      | 42   |
      | config.js   | AWS_KEY = "AKIAIOSFODNN7EXAMPLE"     | 7    |
      | db.ts       | url = "postgres://user:pass@host/db" | 3    |

  @critical @injection
  Scenario: Detect dynamic code execution on user input
    Given a file calls "eval()" on a value derived from a request parameter
    When I run "vibeguard check"
    Then the scan reports a "Critical" finding of category "Injection"

  @medium @cors
  Scenario: Detect permissive CORS on a write API
    Given an API route enables CORS with origin "*"
    And the route accepts write operations
    When I run "vibeguard check"
    Then the scan reports a "Medium" finding of category "Permissive CORS"

  @tls
  Scenario: Detect explicit SSL/TLS disabling
    Given a file sets "NODE_TLS_REJECT_UNAUTHORIZED=0" or an equivalent flag
    When I run "vibeguard check"
    Then the scan reports a finding referencing TLS disabling

  @high @dependencies
  Scenario: Detect a hallucinated dependency in the manifest
    Given "package.json" declares the dependency "express-rate-limitter-ultra"
    And "express-rate-limitter-ultra" does not exist in the public npm registry
    When I run "vibeguard check --deps"
    Then the scan reports a "High" finding of category "Hallucinated package"
    And the report warns about typosquatting and dependency-confusion risk

  @dependencies
  Scenario: Existing dependencies pass the registry check
    Given "package.json" declares only dependencies that exist in the npm registry
    When I run "vibeguard check --deps"
    Then no "Hallucinated package" findings are reported

  @performance
  Scenario: Per-file deterministic check stays within the latency budget
    When a single file is scanned by the deterministic layer
    Then the analysis completes within 20 milliseconds
