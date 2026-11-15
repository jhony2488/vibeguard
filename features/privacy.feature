@privacy @security
Feature: Privacy and non-invasive auditing
  As a developer auditing proprietary code
  I want code privacy and read-only guarantees
  So that analysis never leaks or modifies my source

  @local-llm
  Scenario: Local LLM keeps all code on the machine
    Given VibeGuard is configured with a local LLM (e.g., Ollama)
    When the semantic layer analyzes a file
    Then no source-code snippet leaves the developer's environment

  @sanitization @remote-llm
  Scenario: Pre-send sanitization for cloud LLM providers
    Given VibeGuard is configured with a remote LLM provider
    And a flagged snippet contains an API key, an IP address, and PII
    When the snippet is sent for remote semantic analysis
    Then secrets, IP addresses, and personal data are masked before sending

  @read-only
  Scenario: Scans never modify project files
    When I run any "vibeguard" scan command
    Then the original project files are not modified
    And changes are only applied with express user authorization

  @read-only @fix
  Scenario: Suggested fixes require explicit consent
    Given the semantic layer generated a corrected patch
    When the patch is presented
    Then it is applied only after the user explicitly approves it
