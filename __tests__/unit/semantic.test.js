// features/semantic-audit.feature — IDOR, validation bypass, false-positive handling, explain
import { describe, test, expect, jest } from '@jest/globals';
import { auditSemantic, explainIssue } from '../../src/layers/semantic.js';
import { createMockLlm } from '../helpers/mockLlm.js';

const ctx = (file) => ({ filePath: file });

describe('semantic layer — business-logic flaws', () => {
  // features/semantic-audit.feature — "Detect an authorization bypass (IDOR)"
  test('reports IDOR when the endpoint skips the ownership check', async () => {
    const llm = createMockLlm({
      audit: jest.fn(async () => [
        {
          ruleId: 'VG-SEC-IDOR',
          domain: 'SECURITY',
          severity: 'Critical',
          category: 'Authorization bypass (IDOR)',
          file: 'src/api.ts',
          line: 9,
          message: 'Endpoint returns a resource without verifying ownership.',
          recommendation: 'Check that the order belongs to the authenticated user.',
        },
      ]),
    });
    const code = `app.get('/api/orders/:id', async (req, res) => {
      res.json(await db.orders.findById(req.params.id));
    });`;

    const findings = await auditSemantic({ code, findings: [], llm, ...ctx('src/api.ts') });

    const f = findings.find((x) => x.category === 'Authorization bypass (IDOR)');
    expect(f).toBeDefined();
    expect(f.severity).toBe('Critical');
    expect(f.message).toMatch(/ownership/i);
  });

  // features/semantic-audit.feature — "Detect a validation bypass in access control"
  test('reports access control that trusts a client-supplied flag', async () => {
    const llm = createMockLlm({
      audit: jest.fn(async () => [
        {
          ruleId: 'VG-SEC-BYPASS',
          domain: 'SECURITY',
          severity: 'Critical',
          category: 'Authorization bypass',
          file: 'src/api.ts',
          line: 20,
          message: 'Admin route trusts req.body.isAdmin.',
          recommendation: 'Derive authorization from the authenticated session.',
        },
      ]),
    });
    const code = `app.delete('/api/admin/wipe', (req, res) => { if (req.body.isAdmin) dropAll(); });`;

    const findings = await auditSemantic({ code, findings: [], llm, ...ctx('src/api.ts') });

    expect(findings.some((x) => /bypass/i.test(x.category))).toBe(true);
  });
});

describe('semantic layer — false-positive mitigation', () => {
  // features/semantic-audit.feature — "Dismiss a harmless deterministic alert using context"
  test('dismisses a permissive-CORS alert on a public read-only endpoint', async () => {
    const flagged = {
      ruleId: 'VG-CORS-001',
      domain: 'SECURITY',
      severity: 'Medium',
      category: 'Permissive CORS',
      file: 'src/ping.ts',
      line: 1,
      message: 'CORS * enabled',
      recommendation: 'Restrict origins',
    };
    const llm = createMockLlm({ audit: jest.fn(async () => []) });

    const findings = await auditSemantic({
      code: `app.get('/api/ping', (req, res) => res.json({ ok: true }));`,
      findings: [flagged],
      llm,
      ...ctx('src/ping.ts'),
    });

    expect(findings.find((x) => x.ruleId === 'VG-CORS-001')).toBeUndefined();
  });

  // features/semantic-audit.feature — "Keep a real finding after semantic review"
  test('confirms a real Critical finding after semantic review', async () => {
    const flagged = {
      ruleId: 'VG-SEC-001',
      domain: 'SECURITY',
      severity: 'Critical',
      category: 'Exposed secret',
      file: 'src/auth.ts',
      line: 3,
      message: 'Private key in source',
      recommendation: 'Move to env var',
    };
    const llm = createMockLlm({ audit: jest.fn(async ({ findings }) => findings) });

    const findings = await auditSemantic({
      code: `const k = "sk-proj-real-key";`,
      findings: [flagged],
      llm,
      ...ctx('src/auth.ts'),
    });

    expect(findings.find((x) => x.ruleId === 'VG-SEC-001').severity).toBe('Critical');
  });
});

describe('semantic layer — explain & fix', () => {
  // features/semantic-audit.feature — "Explain a flagged pattern and generate a fix"
  test('returns an explanation and a corrected patch', async () => {
    const llm = createMockLlm({
      explain: jest.fn(async () => ({
        explanation: 'Hardcoded keys leak into VCS history and logs.',
        patch: `const key = process.env.OPENAI_API_KEY;`,
      })),
    });

    const out = await explainIssue({
      ruleId: 'VG-SEC-001',
      codeSnippet: `const k = "sk-proj-abc";`,
      llm,
    });

    expect(out.explanation).toMatch(/risk|leak|security/i);
    expect(out.patch).toContain('process.env');
  });
});
