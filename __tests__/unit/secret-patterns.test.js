// features/deterministic-scan.feature — "Detect hardcoded credentials via regex signatures"
import { describe, test, expect } from '@jest/globals';
import { analyzeDeterministic } from '../../src/layers/deterministic.js';

const ctx = (file) => ({ filePath: file, language: 'typescript' });

describe('deterministic secret-pattern detection', () => {
  test('flags an OpenAI-style key as Critical "Exposed secret" with file/line', () => {
    const code = `const a = 1;\nconst key = "sk-proj-abc123def456ghi789jkl000";\n`;
    const findings = analyzeDeterministic(code, ctx('src/auth.ts'));

    const f = findings.find((x) => x.category === 'Exposed secret');
    expect(f).toBeDefined();
    expect(f.severity).toBe('Critical');
    expect(f.file).toBe('src/auth.ts');
    expect(f.line).toBe(2);
    expect(f.recommendation).toMatch(/environment variable|\.env/i);
  });

  test('flags an AWS-style access key', () => {
    const code = `AWS_KEY = "AKIAIOSFODNN7EXAMPLE";`;
    const findings = analyzeDeterministic(code, ctx('config.js'));

    expect(
      findings.some((x) => x.category === 'Exposed secret' && x.severity === 'Critical'),
    ).toBe(true);
  });

  test('flags a database connection string with embedded credentials', () => {
    const code = `const url = "postgres://user:pass@host/db";`;
    const findings = analyzeDeterministic(code, ctx('db.ts'));

    expect(findings.some((x) => x.category === 'Exposed secret')).toBe(true);
  });

  test('flags secrets inside a committed .env file', () => {
    const env = 'OPENAI_API_KEY=sk-proj-abc123\nAWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\n';
    const findings = analyzeDeterministic(env, { filePath: '.env', language: 'dotenv' });

    expect(findings.filter((x) => x.category === 'Exposed secret').length).toBeGreaterThanOrEqual(2);
  });

  test('does not flag ordinary strings', () => {
    const code = `const greeting = "hello-world-welcome-message";`;
    const findings = analyzeDeterministic(code, ctx('src/messages.ts'));

    expect(findings.filter((x) => x.category === 'Exposed secret')).toHaveLength(0);
  });
});
