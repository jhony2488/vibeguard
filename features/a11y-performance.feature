@a11y @performance
Feature: Accessibility and performance auditing
  As a developer shipping AI-generated front-end code
  I want a11y and performance checks alongside security
  So that vibecoded code is also inclusive and fast for end users

  @a11y @layer1
  Scenario: Image without alt text
    Given a file contains "<img>" without an "alt" attribute
    When I run "vibeguard check --all"
    Then an "A11y" finding is reported for the missing alternative text

  @a11y @layer1
  Scenario: Non-native interactive element without accessibility props
    Given a file contains a "<div>" with "onClick" but no "role" or "tabIndex"
    When I run "vibeguard check --all"
    Then an "A11y" finding recommends "role" and "tabIndex" attributes

  @a11y @layer1
  Scenario: Broken heading hierarchy
    Given a file jumps from "h1" to "h4" without intermediate levels
    When I run "vibeguard check --all"
    Then an "A11y" finding is reported for the heading hierarchy

  @a11y @layer1
  Scenario: Static color-contrast violation
    Given stylesheet tokens produce insufficient contrast for text
    When I run "vibeguard check --all"
    Then an "A11y" finding flags the contrast issue

  @performance @layer1
  Scenario: Unoptimized image in an optimizing framework
    Given a Next.js component uses a native "<img>" element
    When I run "vibeguard check --all"
    Then a "PERFORMANCE" finding recommends the optimized "<Image/>" component
    And the impact on LCP (Largest Contentful Paint) is explained

  @performance @layer1
  Scenario: Bloated library import
    Given a file contains "import * as _ from 'lodash'"
    When I run "vibeguard check --all"
    Then a "PERFORMANCE" finding recommends importing only the needed function
    And the bundle-size impact is reported

  @performance @layer2
  Scenario: God Function flagged by cyclomatic complexity
    Given a file contains an overly long, deeply branched function
    When I run "vibeguard check --all"
    Then the complexity metric flags it as a "God Function"
    And maintainability and runtime impact are reported

  @performance @layer2
  Scenario: Dependency weight estimated before install
    Given an AI-generated "package.json" adds a new dependency
    When the dependency check runs
    Then the estimated bundle-size impact is calculated before allowing install

  @a11y @layer3 @fix
  Scenario: Semantic layer proposes an accessible fix
    Given a generic "<div onClick>" was flagged as an inaccessible control
    When the semantic layer generates a fix
    Then the patch replaces it with a semantic accessible element
    And the explanation references the violated WCAG guideline

  @performance @layer3 @fix
  Scenario: Semantic layer proposes a performance fix
    Given a heavy component was flagged for render cost
    When the semantic layer generates a fix
    Then the patch applies an optimization such as lazy loading
    And the explanation references the affected Core Web Vitals metric
