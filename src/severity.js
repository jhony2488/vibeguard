// Severity classification — mirrors docs/02-architecture.md "Severity Matrix".

const CATEGORY_SEVERITY = new Map([
  ['Exposed secret', 'Critical'],
  ['Injection', 'Critical'],
  ['Authorization bypass (IDOR)', 'Critical'],
  ['Authorization bypass', 'Critical'],
  ['Hallucinated package', 'High'],
  ['High-entropy string', 'High'],
  ['Permissive CORS', 'Medium'],
  ['Stack-trace exposure', 'Low'],
]);

const CATEGORY_FALLBACK = {
  'Exposed secret': 'Critical',
  Injection: 'Critical',
};

const ORDER = ['Low', 'Medium', 'High', 'Critical'];

export function classifyFinding({ category = '' } = {}) {
  if (CATEGORY_SEVERITY.has(category)) return CATEGORY_SEVERITY.get(category);
  if (CATEGORY_FALLBACK[category]) return CATEGORY_FALLBACK[category];
  if (/secret|credential|inject|idor|bypass/i.test(category)) return 'Critical';
  if (/hallucin|entropy|tls/i.test(category)) return 'High';
  if (/a11y|contrast|heading|alt|aria/i.test(category)) return 'Low';
  return 'Medium';
}

export function meetsBlocking(findings = [], minSeverity = 'High') {
  const threshold = ORDER.indexOf(minSeverity);
  return findings.some(
    (f) => ORDER.indexOf(f.severity) >= threshold && ORDER.indexOf(f.severity) !== -1,
  );
}

// Filters a finding list down to `minSeverity` and above — used by
// `watch --min-severity` to surface only severe findings.
export function severityAtLeast(findings = [], minSeverity = 'Low') {
  const threshold = ORDER.indexOf(minSeverity);
  if (threshold === -1) return findings;
  return findings.filter((f) => ORDER.indexOf(f.severity) >= threshold);
}
