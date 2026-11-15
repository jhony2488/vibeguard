// Performance checks — Layer 1 deterministic rules (docs/06-a11y-performance.md).

import { buildCodeModel } from './analyzers/codeModel.js';

function perfFinding({ ruleId, category, severity = 'Medium', file, line, message, recommendation }) {
  return { ruleId, domain: 'PERFORMANCE', category, severity, file, line, message, recommendation };
}

export function checkPerformance(code, ctx = {}) {
  const { filePath = '<unknown>', framework } = ctx;
  const model = buildCodeModel(code, ctx);
  const findings = [];

  // Native <img> in an optimizing framework (Next.js) instead of <Image/>
  if (framework === 'next') {
    for (const el of model.jsxElements) {
      if (el.tag === 'img') {
        findings.push(
          perfFinding({
            ruleId: 'VG-PERF-001',
            category: 'Unoptimized image',
            file: filePath,
            line: el.line,
            message: 'Native <img> used in a Next.js project — impacts LCP (Largest Contentful Paint).',
            recommendation: 'Use the optimized <Image/> component from next/image.',
          }),
        );
      }
    }
  }

  // Bloated namespace imports
  for (const imp of model.imports) {
    const ns = /^\*\s+as\s+/.test(imp.imported);
    if (ns) {
      findings.push(
        perfFinding({
          ruleId: 'VG-PERF-002',
          category: 'Bloated import',
          file: filePath,
          line: imp.line,
          message: `Namespace import of '${imp.specifier}' inflates the bundle size.`,
          recommendation: `Use a named import for only the needed function, e.g. import { fn } from '${imp.specifier}'.`,
        }),
      );
    }
  }

  return findings;
}
