// Report renderers — JSON, SARIF, and interactive terminal (docs/03-cli.md).

export function toJson(report = {}) {
  return {
    findings: report.findings ?? [],
    filesScanned: report.filesScanned,
    auditedFiles: report.auditedFiles ?? [],
    generatedAt: new Date().toISOString(),
  };
}

const SARIF_LEVEL = { Critical: 'error', High: 'error', Medium: 'warning', Low: 'note' };

export function toSarif(report = {}) {
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'VibeGuard',
            version: '0.0.0',
            informationUri: 'https://github.com/vibeguard/vibeguard-cli',
          },
        },
        results: (report.findings ?? []).map((f) => ({
          ruleId: f.ruleId,
          level: SARIF_LEVEL[f.severity] ?? 'warning',
          message: { text: f.message },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: f.file },
                region: { startLine: f.line ?? 1 },
              },
            },
          ],
        })),
      },
    ],
  };
}

const SEVERITY_LABEL = { Critical: 'Critical', High: 'High Risk', Medium: 'Warning', Low: 'Notice' };
const DOMAIN_ORDER = ['SECURITY', 'PERFORMANCE', 'A11y'];

export function renderTerminal(report = {}) {
  const findings = report.findings ?? [];
  const out = [];

  out.push('┌' + '─'.repeat(66) + '┐');
  out.push(`│ VibeGuard Audit Report — ${findings.length} Issues Found`.padEnd(67) + '│');
  out.push('└' + '─'.repeat(66) + '┘');
  out.push('');

  const byDomain = new Map();
  for (const f of findings) {
    const d = f.domain ?? 'SECURITY';
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d).push(f);
  }

  const domains = [...DOMAIN_ORDER, ...byDomain.keys()].filter(
    (d, i, arr) => byDomain.has(d) && arr.indexOf(d) === i,
  );

  for (const domain of domains) {
    for (const f of byDomain.get(domain)) {
      const label = SEVERITY_LABEL[f.severity] ?? f.severity;
      out.push(`  [${domain}] ${label} (line ${f.line} in ${f.file})`);
      out.push(`  └── ${f.message}`);
      if (f.recommendation) out.push(`      Suggestion: ${f.recommendation}`);
      out.push('');
    }
  }

  return out.join('\n');
}
