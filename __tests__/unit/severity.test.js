// features/severity.feature — severity matrix mapping + blocking threshold
import { describe, test, expect } from '@jest/globals';
import { classifyFinding, meetsBlocking } from '../../src/severity.js';

describe('severity classification matrix', () => {
  // features/severity.feature — "Findings map to their documented severity"
  test.each([
    ['Exposed secret', 'Layer 1 (Deterministic)', 'Critical'],
    ['Injection', 'Layer 1 (Deterministic)', 'Critical'],
    ['Authorization bypass (IDOR)', 'Layer 3 (Semantic LLM)', 'Critical'],
    ['Hallucinated package', 'Layers 1 & 2 (integrated)', 'High'],
    ['High-entropy string', 'Layer 2 (Probabilistic)', 'High'],
    ['Permissive CORS', 'Layer 1 (Deterministic)', 'Medium'],
    ['Stack-trace exposure', 'Layer 3 (Semantic LLM)', 'Low'],
  ])('"%s" detected via %s is classified as %s', (category, layer, expected) => {
    expect(classifyFinding({ category, layer })).toBe(expected);
  });
});

describe('blocking threshold for CI gates', () => {
  // features/severity.feature — "Strict mode fails the run on disallowed severities"
  test('meetsBlocking is true when a finding is at or above the threshold', () => {
    const findings = [{ severity: 'High' }, { severity: 'Low' }];
    expect(meetsBlocking(findings, 'High')).toBe(true);
  });

  // features/severity.feature — "Strict mode passes on a clean project"
  test('meetsBlocking is false when nothing reaches the threshold', () => {
    const findings = [{ severity: 'Low' }, { severity: 'Medium' }];
    expect(meetsBlocking(findings, 'High')).toBe(false);
  });

  test('Critical always blocks regardless of threshold', () => {
    expect(meetsBlocking([{ severity: 'Critical' }], 'Low')).toBe(true);
  });
});
