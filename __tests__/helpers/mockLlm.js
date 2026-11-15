import { jest } from '@jest/globals';

// Fake LLM client for semantic-layer and MCP tests.
// Mirrors the `llm` dependency injected into src/layers/semantic.js and src/mcp/server.js.
export function createMockLlm(overrides = {}) {
  return {
    provider: overrides.provider ?? 'local',
    audit:
      overrides.audit ??
      jest.fn(async ({ findings }) => findings),
    explain:
      overrides.explain ??
      jest.fn(async () => ({
        explanation: 'Mocked explanation of the flagged pattern.',
        patch: 'Mocked corrected patch.',
      })),
  };
}
