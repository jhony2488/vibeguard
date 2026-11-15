@layer3 @semantic @llm
Feature: Semantic reasoning via LLM (Layer 3)
  As a developer auditing AI-generated code
  I want context-aware analysis of business logic
  So that authorization flaws and intent-level issues are detected
  and harmless deterministic/probabilistic alerts are dismissed

  @critical @idor
  Scenario: Detect an authorization bypass (IDOR)
    Given an endpoint "GET /api/orders/:id" returns an order by id
    And the handler does not verify that the order belongs to the caller
    When the semantic layer audits the file
    Then a "Critical" finding of category "Authorization bypass (IDOR)" is reported
    And the explanation describes the missing ownership check

  @authorization
  Scenario: Detect a validation bypass in access control
    Given an admin route protected only by a client-supplied "isAdmin" flag
    When the semantic layer audits the file
    Then a finding reports that the access control does not satisfy the expected rule

  @false-positive
  Scenario: Dismiss a harmless deterministic alert using context
    Given the deterministic layer flagged a "Permissive CORS" on a public read-only endpoint
    When the semantic layer reviews the finding
    Then the finding is downgraded or dismissed as harmless for that context

  @false-positive
  Scenario: Keep a real finding after semantic review
    Given the deterministic layer flagged a private key in a source file
    When the semantic layer reviews the finding
    Then the "Critical" severity is confirmed

  @triggering
  Scenario: Semantic layer runs only on flagged or deep-scan files
    Given a file with no deterministic or probabilistic findings
    When I run "vibeguard check" in default mode
    Then the semantic layer is not invoked for that file

  @triggering @deep
  Scenario: Deep scan forces the semantic pass on priority files
    When I run "vibeguard check --deep"
    Then priority files are sent to the semantic layer for full analysis

  @explain
  Scenario: Explain a flagged pattern and generate a fix
    Given a file was flagged by an earlier layer
    When the semantic layer explains the issue
    Then the output describes why the pattern is a security risk
    And proposes a corrected code patch
