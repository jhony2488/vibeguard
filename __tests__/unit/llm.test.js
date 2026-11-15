// features/privacy.feature + features/semantic-audit.feature — real LLM client layer
import { describe, test, expect, jest } from '@jest/globals';
import {
  isLocalUrl,
  createHttpLlm,
  resolveLlmConfig,
  loadLlm,
} from '../../src/layers/llm.js';

describe('isLocalUrl — local vs remote provider detection', () => {
  // features/privacy.feature — "Local LLM keeps all code on the machine"
  test.each([
    'http://localhost:11434',
    'http://127.0.0.1:1234',
    'http://0.0.0.0:8000',
    'http://[::1]:5000',
    'http://192.168.1.50:8080',
    'http://10.0.0.2:11434',
    'http://gpu-box.local:8000',
  ])('%s is classified as local', (url) => {
    expect(isLocalUrl(url)).toBe(true);
  });

  test.each([
    'https://api.openai.com/v1',
    'https://api.groq.com/openai/v1',
    'https://openrouter.ai/api/v1',
  ])('%s is classified as remote', (url) => {
    expect(isLocalUrl(url)).toBe(false);
  });
});

const fencedResponse = (payload) => ({
  ok: true,
  status: 200,
  json: async () => ({
    choices: [{ message: { content: '```json\n' + JSON.stringify(payload) + '\n```' } }],
  }),
});

describe('createHttpLlm — OpenAI-compatible client', () => {
  test('posts to {base}/v1/chat/completions with bearer key and model', async () => {
    const fetchImpl = jest.fn(async () => fencedResponse({ findings: [] }));
    const llm = createHttpLlm({
      baseUrl: 'http://localhost:11434',
      apiKey: 'test-key',
      model: 'codellama',
      fetchImpl,
    });

    await llm.audit({ filePath: 'a.ts', code: 'x', findings: [] });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://localhost:11434/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect(init.headers.authorization).toBe('Bearer test-key');
    expect(JSON.parse(init.body).model).toBe('codellama');
  });

  test('omits the Authorization header when no key is set (local servers)', async () => {
    const fetchImpl = jest.fn(async () => fencedResponse({ findings: [] }));
    const llm = createHttpLlm({ baseUrl: 'http://localhost:11434', model: 'qwen', fetchImpl });

    await llm.audit({ filePath: 'a.ts', code: 'x', findings: [] });
    expect(fetchImpl.mock.calls[0][1].headers.authorization).toBeUndefined();
  });

  test('normalizes baseUrl variants to /v1', async () => {
    const fetchImpl = jest.fn(async () => fencedResponse({ findings: [] }));
    for (const base of [
      'http://localhost:11434/',
      'http://localhost:11434/v1',
      'http://localhost:11434/v1/chat/completions',
    ]) {
      fetchImpl.mockClear();
      const llm = createHttpLlm({ baseUrl: base, model: 'm', fetchImpl });
      await llm.audit({ filePath: 'a.ts', code: 'x', findings: [] });
      expect(fetchImpl.mock.calls[0][0]).toBe('http://localhost:11434/v1/chat/completions');
    }
  });

  // features/semantic-audit.feature — semantic layer returns reviewed findings
  test('returns findings parsed from a fenced JSON response', async () => {
    const flagged = [{ ruleId: 'VG-X', severity: 'Medium', category: 'Permissive CORS', file: 'a.ts', line: 1 }];
    const fetchImpl = jest.fn(async () => fencedResponse({ findings: [] })); // model dismisses it
    const llm = createHttpLlm({ baseUrl: 'http://localhost:11434', model: 'm', fetchImpl });

    const out = await llm.audit({ filePath: 'a.ts', code: 'x', findings: flagged });
    expect(out).toEqual([]);
  });

  test('degrades to input findings on HTTP errors — L1/L2 results are never lost', async () => {
    const flagged = [{ ruleId: 'VG-X', severity: 'High', category: 'Exposed secret' }];
    const fetchImpl = jest.fn(async () => ({ ok: false, status: 500 }));
    const llm = createHttpLlm({ baseUrl: 'https://api.openai.com', model: 'm', fetchImpl });

    expect(await llm.audit({ filePath: 'a.ts', code: 'x', findings: flagged })).toEqual(flagged);
  });

  test('degrades to input findings on unparseable responses', async () => {
    const flagged = [{ ruleId: 'VG-X' }];
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'not json at all' } }] }),
    }));
    const llm = createHttpLlm({ baseUrl: 'http://localhost:11434', model: 'm', fetchImpl });

    expect(await llm.audit({ filePath: 'a.ts', code: 'x', findings: flagged })).toEqual(flagged);
  });

  // features/privacy.feature — "Pre-send sanitization for cloud LLM providers"
  test('remote providers receive sanitized code — raw secrets never leave', async () => {
    const fetchImpl = jest.fn(async () => fencedResponse({ findings: [] }));
    const llm = createHttpLlm({ baseUrl: 'https://api.openai.com', apiKey: 'k', model: 'm', fetchImpl });
    expect(llm.provider).toBe('remote');

    await llm.audit({
      filePath: 'a.ts',
      code: 'const k = "sk-proj-secretkey123456"; const ip = "10.0.0.4";',
      findings: [],
    });

    const sent = JSON.parse(fetchImpl.mock.calls[0][1].body).messages[1].content;
    expect(sent).not.toContain('sk-proj-secretkey123456');
    expect(sent).not.toContain('10.0.0.4');
  });

  test('local providers receive raw code', async () => {
    const fetchImpl = jest.fn(async () => fencedResponse({ findings: [] }));
    const llm = createHttpLlm({ baseUrl: 'http://localhost:11434', model: 'm', fetchImpl });
    expect(llm.provider).toBe('local');

    await llm.audit({ filePath: 'a.ts', code: 'const k = "sk-proj-secretkey123456";', findings: [] });
    const sent = JSON.parse(fetchImpl.mock.calls[0][1].body).messages[1].content;
    expect(sent).toContain('sk-proj-secretkey123456');
  });

  // features/semantic-audit.feature — explain returns {explanation, patch}
  test('explain returns the parsed explanation and patch', async () => {
    const fetchImpl = jest.fn(async () =>
      fencedResponse({ explanation: 'Hardcoded key leaks via VCS.', patch: 'process.env.KEY' }),
    );
    const llm = createHttpLlm({ baseUrl: 'http://localhost:11434', model: 'm', fetchImpl });

    const out = await llm.explain({ ruleId: 'VG-SEC-001', codeSnippet: 'const k = "sk";' });
    expect(out.explanation).toContain('leaks');
    expect(out.patch).toBe('process.env.KEY');
  });
});

describe('resolveLlmConfig — flag > env > rc precedence', () => {
  test('flags win over env and rc', () => {
    const cfg = resolveLlmConfig({
      flags: { llmUrl: 'http://flag:1', llmKey: 'flag-key', llmModel: 'flag-m' },
      env: { VIBEGUARD_LLM_URL: 'http://env:2', VIBEGUARD_LLM_KEY: 'env-key' },
      rc: { llm: { url: 'http://rc:3', apiKey: 'rc-key', model: 'rc-m' } },
    });
    expect(cfg).toEqual({ url: 'http://flag:1', apiKey: 'flag-key', model: 'flag-m' });
  });

  test('env wins over rc', () => {
    const cfg = resolveLlmConfig({
      flags: {},
      env: { VIBEGUARD_LLM_URL: 'http://env:2', VIBEGUARD_LLM_KEY: 'env-key' },
      rc: { llm: { url: 'http://rc:3', apiKey: 'rc-key', model: 'rc-m' } },
    });
    expect(cfg.url).toBe('http://env:2');
    expect(cfg.apiKey).toBe('env-key');
    expect(cfg.model).toBe('rc-m');
  });

  test('common provider env vars are honored as fallback', () => {
    const cfg = resolveLlmConfig({ flags: {}, env: { OPENAI_BASE_URL: 'https://api.openai.com', OPENAI_API_KEY: 'sk-x' }, rc: {} });
    expect(cfg.url).toBe('https://api.openai.com');
    expect(cfg.apiKey).toBe('sk-x');
  });

  test('OLLAMA_HOST maps to a local base URL', () => {
    const cfg = resolveLlmConfig({ flags: {}, env: { OLLAMA_HOST: 'localhost:11434' }, rc: {} });
    expect(cfg.url).toBe('http://localhost:11434');
  });
});

describe('loadLlm — factory', () => {
  test('returns the echo client when nothing is configured', async () => {
    const llm = await loadLlm({ flags: {}, env: {}, cwd: '/nonexistent-dir-xyz' });
    expect(llm.provider).toBe('local');
    expect(await llm.audit({ findings: [1] })).toEqual([1]);
  });

  test('returns an http client when a URL resolves', async () => {
    const llm = await loadLlm({ flags: { llmUrl: 'https://api.openai.com' }, env: {}, cwd: '/nonexistent-dir-xyz' });
    expect(llm.provider).toBe('remote');
  });
});
