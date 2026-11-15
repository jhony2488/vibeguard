// features/privacy.feature — "Pre-send sanitization for cloud LLM providers"
import { describe, test, expect } from '@jest/globals';
import { sanitizeSnippet } from '../../src/sanitize.js';

describe('pre-send sanitization for remote LLM providers', () => {
  const snippet = `
    const key = "sk-proj-abc123def456ghi789";
    const db = "postgres://user:pass@10.20.30.40:5432/prod";
    const user = { email: "jane.doe@example.com", ip: "192.168.1.10" };
  `;

  test('masks API keys in the outgoing snippet', () => {
    const { code } = sanitizeSnippet(snippet);
    expect(code).not.toContain('sk-proj-abc123def456ghi789');
  });

  test('masks IP addresses', () => {
    const { code } = sanitizeSnippet(snippet);
    expect(code).not.toContain('192.168.1.10');
    expect(code).not.toContain('10.20.30.40');
  });

  test('masks personally identifiable information', () => {
    const { code } = sanitizeSnippet(snippet);
    expect(code).not.toContain('jane.doe@example.com');
  });

  test('reports what was masked', () => {
    const { masked } = sanitizeSnippet(snippet);
    expect(masked.length).toBeGreaterThanOrEqual(3);
  });

  test('keeps non-sensitive code intact', () => {
    const { code } = sanitizeSnippet(snippet);
    expect(code).toContain('const user = {');
  });
});
