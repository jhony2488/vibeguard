// Layer 2 — probabilistic & heuristic analysis (docs/02-architecture.md).
// Shannon entropy for secrets, anomaly scoring, and taint estimation.

import { buildCodeModel } from '../analyzers/codeModel.js';
import { classifyFinding } from '../severity.js';

export function shannonEntropy(str = '') {
  if (!str.length) return 0;
  const freq = new Map();
  for (const ch of str) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export const ENTROPY_SECRET_THRESHOLD = 3.5;

export function scoreAnomaly(node = {}) {
  if (node.type === 'CatchClause') {
    return node.bodyLines === 0 ? 0.85 : Math.min(0.4, 0.05 * (node.bodyLines ?? 0));
  }

  const lines = node.lines ?? 0;
  const depth = node.maxNestingDepth ?? 0;
  const branches = node.branchCount ?? 0;

  const score = (lines / 200) * 0.4 + (depth / 6) * 0.3 + (branches / 40) * 0.3;
  return Math.min(1, score);
}

const SANITIZER_RE = /sanitize|escape|encodeURI|validate|DOMPurify|zod\.|schema\.|parse\(|validator\./i;
const SINK_RE = /\b(?:db|client|pool|conn)?\w*\.?(?:query|execute|raw|exec|eval|write|writeFile|appendFile|execSync|spawn|send|find(?:One|Many|ById)?)\s*\(/;
const SOURCE_RE = /\breq\.(?:body|params|query|headers)|\brequest\.(?:body|params|query)|\bprocess\.argv|\buserInput\b/;

export function estimateDataFlow(code, ctx = {}) {
  const { filePath = '<unknown>' } = ctx;
  const model = buildCodeModel(code, ctx);
  const findings = [];

  // Variables assigned directly from a request source.
  const tainted = new Set();
  model.lines.forEach((lineText) => {
    const m = /(?:const|let|var)\s+(\w+)\s*=\s*([^;]*)/.exec(lineText);
    if (m && SOURCE_RE.test(m[2]) && !SANITIZER_RE.test(m[2])) tainted.add(m[1]);
  });

  model.lines.forEach((lineText, i) => {
    if (!SINK_RE.test(lineText)) return;
    if (SANITIZER_RE.test(lineText)) return;

    const sinksReq = SOURCE_RE.test(lineText);
    const sinksTainted = [...tainted].some((v) => new RegExp(`\\b${v}\\b`).test(lineText));
    if (!sinksReq && !sinksTainted) return;

    // Parameterized queries ($1, ?, second-arg array) are safe.
    if (/\?|\$\d/.test(lineText.split(SINK_RE)[1] ?? '') && /,[\s]*\[/.test(lineText)) return;

    findings.push({
      ruleId: 'VG-SEC-010',
      domain: 'SECURITY',
      category: 'Unsafe data flow',
      severity: classifyFinding({ category: 'Injection' }),
      file: filePath,
      line: i + 1,
      message: 'Request-derived value reaches a sensitive sink without visible sanitization (taint estimate).',
      recommendation: 'Sanitize/parameterize the input before it reaches the sink.',
    });
  });

  // High-entropy strings that look like credentials.
  for (const s of model.strings) {
    if (s.value.length >= 20 && shannonEntropy(s.value) > 4.2 && /[A-Z]/.test(s.value) && /[a-z]/.test(s.value) && /\d/.test(s.value)) {
      findings.push({
        ruleId: 'VG-SEC-011',
        domain: 'SECURITY',
        category: 'High-entropy string',
        severity: classifyFinding({ category: 'High-entropy string' }),
        file: filePath,
        line: s.line,
        message: 'High-randomness string literal — probable credential not covered by a fixed signature.',
        recommendation: 'Move the value to an environment variable and verify it is not a leaked secret.',
      });
    }
  }

  return findings;
}

const PACKAGE_SIZE_KB = {
  lodash: 70,
  express: 210,
  react: 45,
  'react-dom': 140,
  next: 900,
  axios: 35,
  moment: 300,
};

export async function estimateDependencyWeight(manifest = {}) {
  const deps = { ...(manifest.dependencies ?? {}), ...(manifest.devDependencies ?? {}) };
  return Object.keys(deps).map((name) => ({
    package: name,
    estimatedKb: PACKAGE_SIZE_KB[name] ?? 50,
  }));
}
