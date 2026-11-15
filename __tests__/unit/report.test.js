// features/cli-commands.feature + features/terminal-ui.feature — report formats & rendering
import { describe, test, expect } from '@jest/globals';
import { toJson, toSarif, renderTerminal } from '../../src/report/index.js';

const report = {
  findings: [
    {
      ruleId: 'VG-SEC-001',
      domain: 'SECURITY',
      severity: 'High',
      category: 'Exposed secret',
      file: 'src/auth.ts',
      line: 42,
      message: 'API secret key detected.',
      recommendation: 'Move to an environment variable in .env.',
    },
    {
      ruleId: 'VG-PERF-001',
      domain: 'PERFORMANCE',
      severity: 'Medium',
      category: 'Unoptimized image',
      file: 'src/components/Hero.tsx',
      line: 12,
      message: 'Native <img> instead of optimized <Image/>.',
      recommendation: 'Use the optimized image component.',
    },
    {
      ruleId: 'VG-A11Y-001',
      domain: 'A11y',
      severity: 'Low',
      category: 'Missing aria-label',
      file: 'src/components/Button.tsx',
      line: 28,
      message: 'Interactive element without accessible name.',
      recommendation: 'Add aria-label or visible text.',
    },
  ],
};

describe('JSON output', () => {
  // features/cli-commands.feature — "JSON output for CI consumption"
  test('produces structured findings with file, line, severity, recommendation', () => {
    const out = toJson(report);
    const f = out.findings[0];

    expect(f).toMatchObject({
      file: 'src/auth.ts',
      line: 42,
      severity: 'High',
    });
    expect(f.recommendation).toBeTruthy();
    expect(f.domain).toBe('SECURITY');
  });
});

describe('SARIF output', () => {
  // features/cli-commands.feature — "SARIF output for security tooling"
  test('produces a SARIF-compliant document', () => {
    const sarif = toSarif(report);

    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs[0].results).toHaveLength(report.findings.length);
    expect(sarif.runs[0].results[0].ruleId).toBe('VG-SEC-001');
  });
});

describe('terminal rendering', () => {
  // features/terminal-ui.feature — "Findings are grouped by domain with severity colors"
  test('groups findings under their domain tags', () => {
    const out = renderTerminal(report);

    expect(out).toContain('[SECURITY]');
    expect(out).toContain('[PERFORMANCE]');
    expect(out).toContain('[A11y]');
  });

  // features/terminal-ui.feature — "Each finding shows file, line, and recommendation"
  test('each finding shows file, line and recommendation', () => {
    const out = renderTerminal(report);

    expect(out).toContain('src/auth.ts');
    expect(out).toContain('42');
    expect(out).toContain('environment variable');
  });

  test('severity labels appear in the output', () => {
    const out = renderTerminal(report);
    expect(out).toMatch(/High/);
    expect(out).toMatch(/Warning|Medium/);
    expect(out).toMatch(/Notice|Low/);
  });
});
