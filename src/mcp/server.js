// MCP server — exposes VibeGuard analysis as Model Context Protocol tools
// and Served Skills (SEP-2640) as skill:// resources (docs/04-mcp-server.md).
// `handleCall` dispatches tool calls; `handleRequest` dispatches JSON-RPC
// methods — the stdio transport lives in ./stdio.js.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { scanFile, scanProject } from '../scanner.js';
import { explainIssue } from '../layers/semantic.js';
import { auditHistory } from '../git/history.js';
import { analyzeDeterministic } from '../layers/deterministic.js';
import { createWatcher } from '../watcher.js';
import { createLocalEchoLlm, createHttpLlm } from '../layers/llm.js';
import { createLocalClassifier } from '../layers/classifier.js';
import { loadSkills, resolveSkillUri, readSkillResource, readSkillDirectory } from './skills.js';
import { RPC_ERRORS, rpcError } from './stdio.js';

const pkg = createRequire(import.meta.url)('../../package.json');
const DEFAULT_SKILLS_DIR = fileURLToPath(new URL('../../skills/', import.meta.url));

export const MCP_TOOLS = [
  'vibeguard_scan_file',
  'vibeguard_scan_project',
  'vibeguard_audit_diff',
  'vibeguard_explain_issue',
  'vibeguard_start_watch',
  'vibeguard_audit_git_history',
];

const MODEL_PARAMS = {
  model: { type: 'string', description: 'Semantic-layer model for this call' },
  llmUrl: { type: 'string', description: 'OpenAI-compatible endpoint URL' },
  llmKey: { type: 'string', description: 'API key for the endpoint' },
  classifierModel: { type: 'string', description: 'Local HF classifier model id' },
  classifierTask: {
    type: 'string',
    description: 'text-classification | token-classification | feature-extraction',
  },
};

export const TOOL_DESCRIPTORS = [
  {
    name: 'vibeguard_scan_file',
    description: 'Deterministic + probabilistic scan of a single file in real time.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        depth: { type: 'string', enum: ['fast', 'full'] },
        ...MODEL_PARAMS,
      },
      required: ['filePath'],
    },
  },
  {
    name: 'vibeguard_scan_project',
    description: 'Scan the whole project before a commit or deploy.',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string' },
        ignorePatterns: { type: 'array', items: { type: 'string' } },
        ...MODEL_PARAMS,
      },
    },
  },
  {
    name: 'vibeguard_audit_diff',
    description:
      'Audit only the added (+) lines of a git diff — agent self-audit before writing to disk.',
    inputSchema: {
      type: 'object',
      properties: { gitDiff: { type: 'string' }, ...MODEL_PARAMS },
      required: ['gitDiff'],
    },
  },
  {
    name: 'vibeguard_explain_issue',
    description: 'Semantic-layer explanation of a flagged pattern plus a corrected patch.',
    inputSchema: {
      type: 'object',
      properties: {
        ruleId: { type: 'string' },
        codeSnippet: { type: 'string' },
        ...MODEL_PARAMS,
      },
      required: ['ruleId', 'codeSnippet'],
    },
  },
  {
    name: 'vibeguard_start_watch',
    description: 'Start a session-scoped watcher that re-audits changed files.',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string' },
        debounceMs: { type: 'number' },
      },
    },
  },
  {
    name: 'vibeguard_audit_git_history',
    description: 'Scan commit history for leaked secrets and hallucinated dependencies.',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string' },
        maxCommits: { type: 'number' },
        secretsOnly: { type: 'boolean' },
        checkPerformance: { type: 'boolean' },
      },
    },
  },
];

const CAPABILITIES = {
  tools: {},
  resources: {},
  extensions: {
    'io.modelcontextprotocol/skills': { directoryRead: true },
  },
};

const SERVER_INFO = { name: 'vibeguard', version: pkg.version };

// Scans only the added (+) lines of a git diff.
function addedLines(gitDiff = '') {
  const lines = [];
  let newLine = 0;
  for (const raw of gitDiff.split('\n')) {
    const hunk = /^@@\s+-\d+(?:,\d+)?\s+\+(\d+)/.exec(raw);
    if (hunk) {
      newLine = Number(hunk[1]) - 1;
      continue;
    }
    if (raw.startsWith('+') && !raw.startsWith('+++')) {
      newLine += 1;
      lines.push({ text: raw.slice(1), line: newLine });
    } else if (!raw.startsWith('-')) {
      newLine += 1;
    }
  }
  return lines;
}

export function createMcpServer(deps = {}) {
  const defaultLlm = deps.llm ?? createLocalEchoLlm();
  const registryClient = deps.registryClient;
  const skillsDir = deps.skillsDir ?? DEFAULT_SKILLS_DIR;
  const io = { readFile: deps.readFile, readdir: deps.readdir };
  const watchers = new Map();
  let skillsCache;

  const skills = async () => (skillsCache ??= await loadSkills(skillsDir, io));

  // Skill entry as served on the wire — without internal fields.
  const publicSkill = (skill) => {
    const { dir, ...entry } = skill;
    void dir;
    return entry;
  };

  // Per-call model resolution — the agent picks models by project context.
  // factories let tools instantiate models on demand without forcing config.
  const resolveLlm = (params) =>
    params.model || params.llmUrl
      ? createHttpLlm({
          baseUrl: params.llmUrl ?? 'http://localhost:11434',
          apiKey: params.llmKey,
          model: params.model,
        })
      : (deps.llmFactory?.(params) ?? defaultLlm);

  const resolveClassifier = (params) =>
    params.classifierModel
      ? (deps.classifierFactory?.(params) ??
        createLocalClassifier({ model: params.classifierModel, task: params.classifierTask }))
      : (deps.classifier ?? null);

  const modelsUsed = (l, c) => ({
    llm: l?.model ?? l?.provider ?? 'echo',
    classifier: c?.model ?? null,
  });

  async function handleCall(name, params = {}) {
    const llm = resolveLlm(params);
    const classifier = resolveClassifier(params);

    switch (name) {
      case 'vibeguard_scan_file': {
        const report = await scanFile({
          filePath: params.filePath,
          depth: params.depth ?? 'fast',
          llm,
          classifier,
          registryClient,
        });
        return { ...report, modelsUsed: modelsUsed(llm, classifier) };
      }

      case 'vibeguard_scan_project': {
        const report = await scanProject({
          directory: params.directory ?? '.',
          llm,
          classifier,
          registryClient,
          ignore: { vibeguardignore: params.ignorePatterns ?? [] },
        });
        return { ...report, modelsUsed: modelsUsed(llm, classifier) };
      }

      case 'vibeguard_audit_diff': {
        const added = addedLines(params.gitDiff);
        const pseudo = added.map((l) => l.text).join('\n');
        const findings = analyzeDeterministic(pseudo, { filePath: '<diff>' }).map((f) => ({
          ...f,
          line: added[Math.max(0, f.line - 1)]?.line ?? f.line,
        }));
        return {
          findings,
          blocked: findings.some((f) => f.severity === 'Critical' || f.severity === 'High'),
          modelsUsed: modelsUsed(llm, classifier),
        };
      }

      case 'vibeguard_explain_issue':
        return explainIssue({ ruleId: params.ruleId, codeSnippet: params.codeSnippet, llm });

      case 'vibeguard_start_watch': {
        const dir = params.directory ?? '.';
        const watcher = createWatcher({
          dir,
          debounceMs: params.debounceMs ?? 1000,
          watcherFactory: params.watcherFactory,
          onBatch: params.onBatch ?? (() => {}),
          onEscalate: params.onEscalate,
        });
        watchers.set(dir, watcher);
        return { started: true, directory: dir };
      }

      case 'vibeguard_audit_git_history':
        return {
          findings: await auditHistory({
            cwd: params.directory ?? params.cwd ?? '.',
            maxCommits: params.maxCommits ?? params.commits,
            secretsOnly: params.secretsOnly ?? params.detectSecrets,
            checkPerformance: params.checkPerformance,
            registryClient,
          }),
        };

      default:
        throw new Error(`Unknown MCP tool: ${name}`);
    }
  }

  // JSON-RPC method dispatcher — tools, resources, and SEP-2640 skills.
  async function handleRequest(method, params = {}) {
    if (method.startsWith('notifications/')) return null;

    switch (method) {
      case 'initialize':
        return {
          protocolVersion: params.protocolVersion ?? '2024-11-05',
          capabilities: CAPABILITIES,
          serverInfo: SERVER_INFO,
        };

      case 'ping':
        return {};

      case 'tools/list':
        return { tools: TOOL_DESCRIPTORS };

      case 'tools/call': {
        if (!params || typeof params.name !== 'string') {
          throw rpcError(RPC_ERRORS.INVALID_PARAMS, 'tools/call requires params.name');
        }
        try {
          const result = await handleCall(params.name, params.arguments ?? {});
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (err) {
          return { content: [{ type: 'text', text: err.message }], isError: true };
        }
      }

      case 'skills/list':
        return { skills: (await skills()).map(publicSkill) };

      case 'skills/get': {
        const list = await skills();
        const want = params.uri;
        const skill = list.find(
          (s) =>
            s.uri === want ||
            `${s.name}` === want ||
            `skill://${s.name}` === want ||
            `skill://${s.name}/SKILL.md` === want,
        );
        if (!skill) throw rpcError(RPC_ERRORS.INVALID_PARAMS, `Unknown skill: ${want}`);
        return { skill: publicSkill(skill) };
      }

      case 'resources/list':
        return {
          resources: (await skills()).flatMap((s) =>
            s.resources.map((r) => ({ ...r, name: r.uri.split('/').pop() })),
          ),
        };

      case 'resources/read': {
        const resolved = resolveSkillUri(params.uri, await skills(), skillsDir);
        if (!resolved || !resolved.rel) {
          throw rpcError(RPC_ERRORS.INVALID_PARAMS, `Cannot read resource: ${params.uri}`);
        }
        try {
          const content = await readSkillResource(resolved, io);
          return { contents: [content] };
        } catch {
          throw rpcError(RPC_ERRORS.INVALID_PARAMS, `Resource not found: ${params.uri}`);
        }
      }

      case 'resources/directory/read': {
        const resolved = resolveSkillUri(params.uri, await skills(), skillsDir);
        if (!resolved) {
          throw rpcError(RPC_ERRORS.INVALID_PARAMS, `Cannot read directory: ${params.uri}`);
        }
        try {
          return { entries: await readSkillDirectory(resolved, io) };
        } catch {
          throw rpcError(RPC_ERRORS.INVALID_PARAMS, `Directory not found: ${params.uri}`);
        }
      }

      default:
        throw rpcError(RPC_ERRORS.METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
  }

  return {
    tools: [...MCP_TOOLS],
    capabilities: CAPABILITIES,
    serverInfo: SERVER_INFO,
    handleCall,
    handleRequest,
    skills,
  };
}
