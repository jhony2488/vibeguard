// LLM provider layer (docs/02-architecture.md — Layer 3).
//
// Two implementations share the { audit, explain, provider } contract:
//   - createLocalEchoLlm() — offline default, passes findings through
//   - createHttpLlm()      — OpenAI-compatible Chat Completions client; one
//     client covers local servers (Ollama, LM Studio, vLLM, llama.cpp) and
//     remote APIs (OpenAI, Groq, OpenRouter, Mistral, DeepSeek, Azure-style
//     deployments). The `provider` flag drives snippet sanitization upstream.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import { sanitizeSnippet } from '../sanitize.js';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MODEL = 'auto';

const LOCAL_HOST_RE =
  /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|::1|\[::1\]|10(?:\.\d{1,3}){3}|172\.(1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2}|[^.]*\.local)$/i;

export function isLocalUrl(url = '') {
  try {
    const { hostname } = new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`);
    return LOCAL_HOST_RE.test(hostname);
  } catch {
    return false;
  }
}

function normalizeBaseUrl(baseUrl) {
  let base = String(baseUrl).trim().replace(/\/+$/, '');
  base = base.replace(/\/chat\/completions$/i, '');
  if (!/\/v\d+$/i.test(base)) base += '/v1';
  return base;
}

function extractJson(content = '') {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(content);
  const candidate = fenced ? fenced[1] : content;
  return JSON.parse(candidate.trim());
}

function chatMessages(system, user) {
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

const AUDIT_SYSTEM = `You are VibeGuard's semantic security-analysis layer.
You receive a source file plus findings already reported by deterministic and
heuristic layers. Review them: dismiss clear false positives by omitting them,
confirm real ones, and add business-logic flaws only semantic reasoning can
catch (IDOR, authorization bypass, unsafe privilege flags, intent mismatch).
Reply with ONLY a JSON object — no prose — shaped:
{"findings":[{"ruleId":"VG-SEC-LLM","domain":"SECURITY","severity":"Critical|High|Medium|Low","category":"...","file":"...","line":0,"message":"...","recommendation":"..."}]}`;

const EXPLAIN_SYSTEM = `You are VibeGuard's remediation explainer.
Given a rule ID and a vulnerable code snippet, explain the security risk and
produce a corrected patch. Reply with ONLY a JSON object — no prose — shaped:
{"explanation":"...","patch":"..."}`;

export function createHttpLlm({ baseUrl, apiKey, model = DEFAULT_MODEL, fetchImpl, timeoutMs } = {}) {
  if (!baseUrl) throw new Error('createHttpLlm requires a baseUrl');
  const base = normalizeBaseUrl(baseUrl);
  const provider = isLocalUrl(baseUrl) ? 'local' : 'remote';
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);

  async function chat(messages) {
    const headers = { 'content-type': 'application/json' };
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;
    const res = await doFetch(`${base}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages, temperature: 0.1 }),
      signal: AbortSignal.timeout(timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`llm http ${res.status}`);
    const body = await res.json();
    return body?.choices?.[0]?.message?.content ?? '';
  }

  return {
    provider,
    baseUrl: base,
    model,

    async audit({ filePath, code, findings = [] }) {
      try {
        // Sanitization is the caller's responsibility upstream, but a remote
        // provider is double-checked here so a missed call never leaks secrets.
        const safeCode = provider === 'remote' ? sanitizeSnippet(code).code : code;
        const content = await chat(
          chatMessages(
            AUDIT_SYSTEM,
            `FILE: ${filePath}\n\nCODE:\n${safeCode}\n\nEXISTING FINDINGS:\n${JSON.stringify(findings)}`,
          ),
        );
        const parsed = extractJson(content);
        return Array.isArray(parsed.findings) ? parsed.findings : findings;
      } catch {
        return findings; // graceful degradation — never lose L1/L2 results
      }
    },

    async explain({ ruleId, codeSnippet }) {
      try {
        const safeSnippet = provider === 'remote' ? sanitizeSnippet(codeSnippet).code : codeSnippet;
        const content = await chat(
          chatMessages(EXPLAIN_SYSTEM, `RULE: ${ruleId}\n\nSNIPPET:\n${safeSnippet}`),
        );
        const parsed = extractJson(content);
        return {
          explanation: parsed.explanation ?? content,
          patch: parsed.patch ?? null,
        };
      } catch (err) {
        return {
          explanation: `LLM explanation unavailable (${err.message}).`,
          patch: null,
        };
      }
    },
  };
}

export function createLocalEchoLlm() {
  return {
    provider: 'local',
    audit: async ({ findings }) => findings,
    explain: async ({ ruleId }) => ({
      explanation: `Offline mode: no LLM configured to explain rule ${ruleId}. Set VIBEGUARD_LLM_URL/VIBEGUARD_LLM_KEY or run a local model (Ollama) for semantic explanations.`,
      patch: null,
    }),
  };
}

export function resolveLlmConfig({ flags = {}, env = process.env, rc = {} } = {}) {
  const llm = rc.llm ?? rc;
  return {
    url:
      flags.llmUrl ??
      env.VIBEGUARD_LLM_URL ??
      env.OPENAI_BASE_URL ??
      (env.OLLAMA_HOST ? `http://${env.OLLAMA_HOST}` : undefined) ??
      llm.url,
    apiKey:
      flags.llmKey ??
      env.VIBEGUARD_LLM_KEY ??
      env.OPENAI_API_KEY ??
      llm.apiKey ??
      llm.key,
    model:
      flags.llmModel ??
      env.VIBEGUARD_LLM_MODEL ??
      env.OPENAI_MODEL ??
      llm.model,
  };
}

export async function readRcFile(cwd = '.', { read = readFile, home = homedir() } = {}) {
  for (const p of [path.join(cwd, '.vibeguardrc'), path.join(home, '.vibeguardrc')]) {
    try {
      return JSON.parse(await read(p, 'utf8'));
    } catch {
      // try next location
    }
  }
  return {};
}

export async function loadLlm({ flags = {}, env = process.env, cwd = '.', fetchImpl } = {}) {
  const rc = await readRcFile(cwd);
  const cfg = resolveLlmConfig({ flags, env, rc });
  if (!cfg.url) return createLocalEchoLlm();
  return createHttpLlm({
    baseUrl: cfg.url,
    apiKey: cfg.apiKey,
    model: cfg.model ?? DEFAULT_MODEL,
    fetchImpl,
  });
}
