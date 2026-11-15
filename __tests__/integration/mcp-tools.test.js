// features/mcp-server.feature — tool surface, audit_diff agent loop, explain_issue
import { describe, test, expect, jest } from '@jest/globals';
import { createMcpServer } from '../../src/mcp/server.js';
import { createMockLlm } from '../helpers/mockLlm.js';
import { createMockRegistry } from '../helpers/mockRegistry.js';

const makeServer = () =>
  createMcpServer({
    llm: createMockLlm(),
    registryClient: createMockRegistry(['express', 'lodash']),
  });

describe('MCP server — tool surface', () => {
  // features/mcp-server.feature — "Server exposes the documented tools"
  test('exposes all six documented tools', () => {
    const server = makeServer();

    expect(server.tools).toEqual(
      expect.arrayContaining([
        'vibeguard_scan_file',
        'vibeguard_scan_project',
        'vibeguard_audit_diff',
        'vibeguard_explain_issue',
        'vibeguard_start_watch',
        'vibeguard_audit_git_history',
      ]),
    );
  });
});

describe('vibeguard_audit_diff — agent self-audit loop', () => {
  const diff = `+const key = "sk-proj-abc123def456";
+app.use(cors({ origin: "*" }));
 const x = 1;`;

  // features/mcp-server.feature — "Agent self-audits freshly generated code"
  test('audits only the changed lines of the diff', async () => {
    const server = makeServer();
    const result = await server.handleCall('vibeguard_audit_diff', { gitDiff: diff });

    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.every((f) => f.line > 0)).toBe(true);
  });

  // features/mcp-server.feature — "Agent fixes a high-severity finding before delivering"
  test('a High/Critical finding is returned so the agent can fix before writing', async () => {
    const server = makeServer();
    const result = await server.handleCall('vibeguard_audit_diff', { gitDiff: diff });

    expect(result.findings.some((f) => ['High', 'Critical'].includes(f.severity))).toBe(true);
    expect(result.blocked).toBe(true);
  });
});

describe('vibeguard_explain_issue — semantic explanation', () => {
  // features/mcp-server.feature — "Explain a flagged pattern via the semantic layer"
  test('returns an explanation and a corrected patch', async () => {
    const llm = createMockLlm({
      explain: jest.fn(async () => ({
        explanation: 'Permissive CORS exposes write APIs to any origin.',
        patch: `cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') })`,
      })),
    });
    const server = createMcpServer({ llm, registryClient: createMockRegistry() });

    const out = await server.handleCall('vibeguard_explain_issue', {
      ruleId: 'VG-CORS-001',
      codeSnippet: `app.use(cors({ origin: '*' }));`,
    });

    expect(out.explanation).toMatch(/cors|origin|risk/i);
    expect(out.patch).toContain('ALLOWED_ORIGINS');
  });
});
