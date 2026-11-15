// features/deterministic-scan.feature + probabilistic-scan.feature + semantic-audit.feature
// Full scan pipeline over the vulnerable fixture project.
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { scanProject, scanFile } from '../../src/scanner.js';
import { createMockLlm } from '../helpers/mockLlm.js';
import { createMockRegistry } from '../helpers/mockRegistry.js';
import { copyFixtureProject, cleanup } from '../helpers/tmpProject.js';

let dir;
beforeAll(async () => {
  dir = await copyFixtureProject('vulnerable-project');
});
afterAll(async () => cleanup(dir));

const deps = () => ({
  llm: createMockLlm(),
  registryClient: createMockRegistry(['express', 'lodash']),
});

describe('scanProject — layered pipeline over the fixture project', () => {
  // features/deterministic-scan.feature — secrets + hallucinated deps via L1
  test('aggregates deterministic findings across the project', async () => {
    const report = await scanProject({ directory: dir, ...deps() });

    expect(report.findings.some((f) => f.category === 'Exposed secret')).toBe(true);
    expect(report.findings.some((f) => f.category === 'Permissive CORS')).toBe(true);
    expect(report.findings.some((f) => f.category === 'Hallucinated package')).toBe(true);
  });

  // features/probabilistic-scan.feature — entropy + taint via L2
  test('includes probabilistic findings (entropy / unsafe flows)', async () => {
    const report = await scanProject({ directory: dir, ...deps() });

    expect(
      report.findings.some((f) => /entropy|flow|taint/i.test(f.category)),
    ).toBe(true);
  });

  // features/severity.feature — every finding carries a classified severity
  test('every finding is classified with a severity', async () => {
    const report = await scanProject({ directory: dir, ...deps() });

    for (const f of report.findings) {
      expect(['Critical', 'High', 'Medium', 'Low']).toContain(f.severity);
    }
  });
});

describe('layer orchestration', () => {
  // features/semantic-audit.feature — "Semantic layer runs only on flagged or deep-scan files"
  test('default mode invokes the LLM only for flagged files', async () => {
    const llm = createMockLlm();
    await scanProject({ directory: dir, llm, registryClient: createMockRegistry(['express', 'lodash']) });

    const audited = llm.audit.mock.calls.map(([arg]) => arg.filePath);
    expect(audited).toContain('src/auth.ts');
    expect(audited).not.toContain('README.md');
  });

  // features/semantic-audit.feature — "Deep scan forces the semantic pass on priority files"
  test('deep mode sends priority files through the semantic layer', async () => {
    const llm = createMockLlm();
    const report = await scanProject({
      directory: dir,
      deep: true,
      llm,
      registryClient: createMockRegistry(['express', 'lodash']),
    });

    expect(llm.audit).toHaveBeenCalled();
    expect(report.findings.length).toBeGreaterThan(0);
  });
});

describe('scanFile — MCP fast/full depth contract', () => {
  // features/mcp-server.feature — "Scan a single file in fast depth"
  test("depth 'fast' runs layers 1–2 without the LLM", async () => {
    const llm = createMockLlm();
    const report = await scanFile({
      filePath: `${dir}/src/auth.ts`,
      depth: 'fast',
      llm,
      registryClient: createMockRegistry(),
    });

    expect(report.findings.length).toBeGreaterThan(0);
    expect(llm.audit).not.toHaveBeenCalled();
  });

  test("depth 'full' includes the semantic layer", async () => {
    const llm = createMockLlm();
    await scanFile({
      filePath: `${dir}/src/api.ts`,
      depth: 'full',
      llm,
      registryClient: createMockRegistry(),
    });

    expect(llm.audit).toHaveBeenCalled();
  });
});

describe('privacy — remote LLM path', () => {
  // features/privacy.feature — "Pre-send sanitization for cloud LLM providers"
  test('secrets are masked before a remote provider call', async () => {
    const llm = createMockLlm({ provider: 'remote' });
    await scanProject({ directory: dir, deep: true, llm, registryClient: createMockRegistry() });

    for (const [arg] of llm.audit.mock.calls) {
      expect(arg.code ?? '').not.toContain('sk-proj-abc123def456ghi789jkl000mno111pqr222stu333');
      expect(arg.code ?? '').not.toContain('postgres://admin:hunter2');
    }
  });
});
