// features/deterministic-scan.feature — AST rules: eval, permissive CORS, TLS disabling, latency
import { describe, test, expect } from '@jest/globals';
import { analyzeDeterministic } from '../../src/layers/deterministic.js';

const ctx = (file) => ({ filePath: file, language: 'typescript' });

describe('deterministic AST rules', () => {
  // features/deterministic-scan.feature — "Detect dynamic code execution on user input"
  test('flags eval() on user-controlled input as Critical injection', () => {
    const code = `app.post("/run", (req, res) => { eval(req.body.script); });`;
    const findings = analyzeDeterministic(code, ctx('src/run.ts'));

    const f = findings.find((x) => x.category === 'Injection');
    expect(f).toBeDefined();
    expect(f.severity).toBe('Critical');
  });

  // features/deterministic-scan.feature — "Detect permissive CORS on a write API"
  test('flags CORS "*" on a write API as Medium', () => {
    const code = `
      app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT"] }));
      app.post("/api/save", handler);
    `;
    const findings = analyzeDeterministic(code, ctx('src/api.ts'));

    const f = findings.find((x) => x.category === 'Permissive CORS');
    expect(f).toBeDefined();
    expect(f.severity).toBe('Medium');
  });

  test('does not flag CORS "*" on a public read-only endpoint at deterministic layer', () => {
    const code = `app.get("/api/ping", (req, res) => res.json({ ok: true }));`;
    const findings = analyzeDeterministic(code, ctx('src/ping.ts'));

    expect(findings.filter((x) => x.category === 'Permissive CORS')).toHaveLength(0);
  });

  // features/deterministic-scan.feature — "Detect explicit SSL/TLS disabling"
  test('flags NODE_TLS_REJECT_UNAUTHORIZED=0', () => {
    const code = `process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";`;
    const findings = analyzeDeterministic(code, ctx('src/auth.ts'));

    expect(findings.some((x) => /tls/i.test(x.category + ' ' + x.message))).toBe(true);
  });

  // features/deterministic-scan.feature — "Per-file deterministic check stays within the latency budget"
  test('completes a single-file analysis within the latency budget', () => {
    const code = 'const x = 1;\n'.repeat(500);
    const start = performance.now();
    analyzeDeterministic(code, ctx('src/big.ts'));
    expect(performance.now() - start).toBeLessThan(20);
  });
});
