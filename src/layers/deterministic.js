// Layer 1 — deterministic analysis (docs/02-architecture.md).
// Strict, low-latency rules over the code model: secret signatures,
// dangerous calls, permissive CORS, TLS disabling, registry existence checks.

import { buildCodeModel, lineOf } from '../analyzers/codeModel.js';
import { classifyFinding } from '../severity.js';

const SECRET_SIGNATURES = [
  { re: /sk-[A-Za-z0-9_-]{8,}/, label: 'OpenAI-style API key' },
  { re: /AKIA[0-9A-Z]{16}/, label: 'AWS access key ID' },
  { re: /ghp_[A-Za-z0-9]{20,}/, label: 'GitHub personal access token' },
  { re: /(?:postgres|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s'"]+:[^\s'"]+@/i, label: 'database connection string with credentials' },
  { re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, label: 'JWT token' },
  { re: /(?:api[_-]?key|api[_-]?secret|secret|token|password|passwd|private[_-]?key)\s*[:=]\s*['"`][^'"`\n]{8,}['"`]/i, label: 'hardcoded credential' },
];

const WRITE_METHOD_RE = /\.(post|put|patch|delete)\s*\(|methods\s*:\s*\[[^\]]*(POST|PUT|PATCH|DELETE)/i;

function finding({ ruleId, category, file, line, message, recommendation, domain = 'SECURITY' }) {
  return {
    ruleId,
    domain,
    category,
    severity: classifyFinding({ category }),
    file,
    line,
    message,
    recommendation,
  };
}

export function analyzeDeterministic(code, ctx = {}) {
  const { filePath = '<unknown>' } = ctx;
  const model = buildCodeModel(code, ctx);
  const findings = [];

  // --- Secret signatures ------------------------------------------------
  model.lines.forEach((lineText, i) => {
    for (const { re, label } of SECRET_SIGNATURES) {
      if (re.test(lineText)) {
        findings.push(
          finding({
            ruleId: 'VG-SEC-001',
            category: 'Exposed secret',
            file: filePath,
            line: i + 1,
            message: `Possible ${label} detected in source.`,
            recommendation: 'Move the value to an environment variable in .env and revoke the exposed credential.',
          }),
        );
        break; // one finding per line is enough
      }
    }
  });

  // --- Dynamic code execution on user input ------------------------------
  model.lines.forEach((lineText, i) => {
    if (/\beval\s*\(/.test(lineText) && /\breq\.|request\.|input|user/i.test(lineText)) {
      findings.push(
        finding({
          ruleId: 'VG-SEC-002',
          category: 'Injection',
          file: filePath,
          line: i + 1,
          message: 'Dynamic code execution (eval) on user-controlled input.',
          recommendation: 'Remove eval and validate/parse the input explicitly.',
        }),
      );
    }
  });

  // --- Permissive CORS on write APIs -------------------------------------
  const corsLine = model.lines.findIndex((l) => /cors\s*\([^)]*origin\s*:\s*['"`]\*/s.test(l) || /origin\s*:\s*['"`]\*['"`]/.test(l));
  const hasWriteOp = model.lines.some((l) => WRITE_METHOD_RE.test(l));
  if (corsLine !== -1 && hasWriteOp) {
    findings.push(
      finding({
        ruleId: 'VG-SEC-003',
        category: 'Permissive CORS',
        file: filePath,
        line: corsLine + 1,
        message: 'CORS allows any origin (*) on an API that accepts write operations.',
        recommendation: 'Restrict origins to an allowlist for write-capable endpoints.',
      }),
    );
  }

  // --- Explicit TLS disabling ---------------------------------------------
  model.lines.forEach((lineText, i) => {
    if (/NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"`]?0/.test(lineText) || /rejectUnauthorized\s*:\s*false/i.test(lineText)) {
      findings.push(
        finding({
          ruleId: 'VG-SEC-004',
          category: 'TLS disabled',
          file: filePath,
          line: i + 1,
          message: 'TLS certificate verification is explicitly disabled.',
          recommendation: 'Re-enable TLS verification; fix the certificate chain instead of bypassing it.',
        }),
      );
    }
  });

  return findings;
}

export async function checkDependencies(manifest = {}, { registryClient } = {}) {
  const deps = {
    ...(manifest.dependencies ?? {}),
    ...(manifest.devDependencies ?? {}),
  };
  const findings = [];

  const checks = Object.keys(deps).map(async (name) => {
    let exists;
    try {
      exists = await registryClient.exists(name);
    } catch (err) {
      findings.push(
        finding({
          ruleId: 'VG-DEP-002',
          category: 'Registry check failed',
          file: 'package.json',
          line: 0,
          message: `Could not verify "${name}" against the registry: ${err.message}`,
          recommendation: 'Retry when the registry is reachable — unverified dependencies may hide hallucinated packages.',
        }),
      );
      return;
    }

    if (!exists) {
      findings.push(
        finding({
          ruleId: 'VG-DEP-001',
          category: 'Hallucinated package',
          file: 'package.json',
          line: 0,
          message: `Dependency "${name}" does not exist in the package registry — likely an AI hallucination (typosquatting / dependency confusion risk).`,
          recommendation: 'Remove it or replace it with a verified, published alternative. Check for typosquatting lookalikes.',
        }),
      );
    }
  });

  await Promise.all(checks);
  return findings;
}

export { lineOf };
