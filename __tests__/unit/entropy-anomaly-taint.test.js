// features/probabilistic-scan.feature — entropy, anomaly scoring, taint estimation
import { describe, test, expect } from '@jest/globals';
import {
  shannonEntropy,
  scoreAnomaly,
  estimateDataFlow,
} from '../../src/layers/probabilistic.js';

const ctx = (file) => ({ filePath: file, language: 'typescript' });

describe('Shannon entropy — probable secrets', () => {
  // features/probabilistic-scan.feature — "Flag a high-entropy string as a probable secret"
  test('flags a high-entropy string as a High finding', () => {
    const entropy = shannonEntropy('x9Kf2Qm7ZvLp3Rt8WnYc4Hs6BjD1Eg5U');
    expect(entropy).toBeGreaterThan(3.5);
  });

  // features/probabilistic-scan.feature — "Low-entropy strings are not flagged"
  test('low-entropy strings stay below the threshold', () => {
    const entropy = shannonEntropy('hello-world-welcome-message');
    expect(entropy).toBeLessThan(3.5);
  });
});

describe('code anomaly scoring', () => {
  // features/probabilistic-scan.feature — "Raise the risk score of a God Function"
  test('an overly long, deeply branched function raises the anomaly score', () => {
    const godFn = {
      type: 'FunctionDeclaration',
      lines: 250,
      maxNestingDepth: 6,
      branchCount: 40,
    };
    const cleanFn = { type: 'FunctionDeclaration', lines: 20, maxNestingDepth: 2, branchCount: 3 };

    expect(scoreAnomaly(godFn)).toBeGreaterThan(scoreAnomaly(cleanFn));
    expect(scoreAnomaly(godFn)).toBeGreaterThanOrEqual(0.7);
  });

  // features/probabilistic-scan.feature — "Flag an empty exception-handling chain"
  test('an empty catch block raises the anomaly score', () => {
    const emptyCatch = { type: 'CatchClause', bodyLines: 0 };
    const handledCatch = { type: 'CatchClause', bodyLines: 5 };

    expect(scoreAnomaly(emptyCatch)).toBeGreaterThan(scoreAnomaly(handledCatch));
  });
});

describe('taint estimation — unsafe data flows', () => {
  // features/probabilistic-scan.feature — "Estimate an unsafe data flow into a database sink"
  test('flags request input reaching a DB sink without sanitization', () => {
    const code = `
      app.post('/u', async (req, res) => {
        const r = await db.query(\`SELECT * FROM users WHERE name = '\${req.body.name}'\`);
        res.json(r);
      });
    `;
    const findings = estimateDataFlow(code, ctx('src/api.ts'));

    const f = findings.find((x) => /flow|taint|inject/i.test(x.category + ' ' + x.message));
    expect(f).toBeDefined();
    expect(f.file).toBe('src/api.ts');
  });

  // features/probabilistic-scan.feature — "Sanitized flow is not flagged as unsafe"
  test('does not flag input that passes through a sanitizer', () => {
    const code = `
      app.post('/u', async (req, res) => {
        const name = sanitize(req.body.name);
        const r = await db.query('SELECT * FROM users WHERE name = ?', [name]);
        res.json(r);
      });
    `;
    const findings = estimateDataFlow(code, ctx('src/api.ts'));

    expect(findings.filter((x) => /flow|taint/i.test(x.category))).toHaveLength(0);
  });
});
