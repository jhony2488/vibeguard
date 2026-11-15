// Pre-send sanitization for remote LLM providers (docs/02-architecture.md).
// Masks secrets, IPs, and PII before code leaves the machine.

const MASKS = [
  { name: 'api-key', re: /sk-[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}/g },
  { name: 'url-credentials', re: /(postgres|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s'"/]+:[^\s'"/]+@/gi },
  { name: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { name: 'ipv4', re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  { name: 'generic-secret', re: /((?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*['"`])[^'"`\n]+(['"`])/gi },
];

export function sanitizeSnippet(code = '') {
  const masked = [];
  let out = code;

  for (const { name, re } of MASKS) {
    out = out.replace(re, (...args) => {
      masked.push(name);
      if (name === 'generic-secret') return `${args[1]}<REDACTED_SECRET>${args[2]}`;
      if (name === 'url-credentials') return '<REDACTED_CONN_STRING>';
      return `<REDACTED_${name.toUpperCase().replace(/-/g, '_')}>`;
    });
  }

  return { code: out, masked };
}
