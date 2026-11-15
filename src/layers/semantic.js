// Layer 3 — semantic reasoning via LLM (docs/02-architecture.md).
// The LLM client is always injected ({ audit, explain, provider }).
// Remote providers receive sanitized code only — never raw secrets.

import { sanitizeSnippet } from '../sanitize.js';

export async function auditSemantic({ filePath, code, findings = [], llm }) {
  if (!llm) return findings;

  const payload = {
    filePath,
    code: llm.provider === 'remote' ? sanitizeSnippet(code).code : code,
    findings,
  };

  return llm.audit(payload);
}

export async function explainIssue({ ruleId, codeSnippet, llm }) {
  if (!llm) throw new Error('explainIssue requires an llm client');
  const snippet = llm.provider === 'remote' ? sanitizeSnippet(codeSnippet).code : codeSnippet;
  return llm.explain({ ruleId, codeSnippet: snippet });
}
