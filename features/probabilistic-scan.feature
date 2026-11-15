@layer2 @probabilistic
Feature: Probabilistic and heuristic analysis (Layer 2)
  As a developer auditing AI-generated code
  I want statistical anomaly detection beyond fixed rules
  So that vulnerabilities without a known signature are still caught

  Background:
    Given a project containing AI-generated source files

  @high @secrets @entropy
  Scenario: Flag a high-entropy string as a probable secret
    Given a file contains the string "x9Kf2Qm7ZvLp3Rt8WnYc4Hs6BjD1Eg5U"
    And the string has Shannon entropy above the configured threshold
    When I run "vibeguard check"
    Then the scan reports a "High" finding of category "High-entropy string"

  @entropy
  Scenario: Low-entropy strings are not flagged
    Given a file contains the string "hello-world-welcome-message"
    And the string has Shannon entropy below the configured threshold
    When I run "vibeguard check"
    Then no "High-entropy string" finding is reported for it

  @complexity
  Scenario: Raise the risk score of a God Function
    Given a file contains a function with more than 200 lines and deep branching
    When I run "vibeguard check"
    Then the anomaly score of that function is raised
    And the file is marked as a priority candidate for the semantic layer

  @complexity
  Scenario: Flag an empty exception-handling chain
    Given a file contains a "catch" block with an empty body
    When I run "vibeguard check"
    Then the anomaly score of that block is raised

  @taint
  Scenario: Estimate an unsafe data flow into a database sink
    Given a route handler reads a value from "req.params.id"
    And the value reaches a database query without any sanitization step
    When I run "vibeguard check"
    Then the scan reports an estimated unsafe data flow
    And the file is escalated for semantic analysis

  @taint
  Scenario: Sanitized flow is not flagged as unsafe
    Given a route handler reads a value from "req.body.email"
    And the value passes through a validation/sanitization function
    When the value reaches a database query
    Then no unsafe data-flow finding is reported for that path
