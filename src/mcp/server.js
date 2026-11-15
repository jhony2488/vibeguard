// MCP server — exposes VibeGuard analysis as Model Context Protocol tools
// (docs/04-mcp-server.md). Transport-agnostic core: `tools` lists the exposed
// names and `handleCall` dispatches JSON-RPC-style calls to the engines.

import { scanFile, scanProject } from '../scanner.js';
import { explainIssue } from '../layers/semantic.js';
import { auditHistory } from '../git/history.js';
import { analyzeDeterministic } from '../layers/deterministic.js';
import { createWatcher } from '../watcher.js';
import { createLocalEchoLlm } from '../layers/llm.js';

export const MCP_TOOLS = [
  'vibeguard_scan_file',
  'vibeguard_scan_project',
  'vibeguard_audit_diff',
  'vibeguard_explain_issue',
  'vibeguard_start_watch',
  'vibeguard_audit_git_history',
];

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
  const llm = deps.llm ?? createLocalEchoLlm();
  const registryClient = deps.registryClient;
  const watchers = new Map();

  async function handleCall(name, params = {}) {
    switch (name) {
      case 'vibeguard_scan_file':
        return scanFile({ filePath: params.filePath, depth: params.depth ?? 'fast', llm, registryClient });

      case 'vibeguard_scan_project':
        return scanProject({
          directory: params.directory ?? '.',
          llm,
          registryClient,
          ignore: { vibeguardignore: params.ignorePatterns ?? [] },
        });

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
            registryClient,
          }),
        };

      default:
        throw new Error(`Unknown MCP tool: ${name}`);
    }
  }

  return { tools: [...MCP_TOOLS], handleCall };
}
