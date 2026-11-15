#!/usr/bin/env node
// VibeGuard CLI — check / watch / audit-history / mcp (docs/03-cli.md).

import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { scanProject } from './scanner.js';
import { auditHistory } from './git/history.js';
import { createWatcher, shouldEscalate } from './watcher.js';
import { toJson, toSarif, renderTerminal } from './report/index.js';
import { meetsBlocking, severityAtLeast } from './severity.js';
import { loadLlm } from './layers/llm.js';
import { loadClassifier } from './layers/classifier.js';
import { createNotifier } from './notify.js';
import { createMcpServer } from './mcp/server.js';
import { runStdioServer } from './mcp/stdio.js';

const ALL_DOMAINS = ['security', 'perf', 'a11y'];

const FLAG_SPEC = {
  deep: 'boolean',
  deps: 'boolean',
  all: 'boolean',
  focus: 'value',
  'history-only': 'boolean',
  staged: 'boolean',
  strict: 'boolean',
  format: 'value',
  report: 'boolean',
  interactive: 'boolean',
  path: 'value',
  debounce: 'value',
  'min-severity': 'value',
  notify: 'boolean',
  commits: 'value',
  'detect-secrets': 'boolean',
  'check-performance': 'boolean',
  'llm-url': 'value',
  'llm-model': 'value',
  'llm-key': 'value',
  'classifier-model': 'value',
  'classifier-task': 'value',
  'no-classifier': 'boolean',
};

export function parseArgs(argv = []) {
  const command = argv[0] ?? 'check';
  if (!['check', 'watch', 'audit-history', 'mcp'].includes(command)) {
    throw new Error(
      `Unknown command: ${command}\nUsage: vibeguard <check|watch|audit-history|mcp> [flags]`,
    );
  }

  const cfg = {
    command,
    directory: '.',
    deep: false,
    depsOnly: false,
    all: false,
    focus: undefined,
    historyOnly: false,
    staged: false,
    strict: false,
    format: undefined,
    report: false,
    interactive: undefined,
    path: undefined,
    debounceMs: undefined,
    minSeverity: undefined,
    notify: false,
    maxCommits: undefined,
    detectSecrets: false,
    checkPerformance: false,
    llmUrl: undefined,
    llmModel: undefined,
    llmKey: undefined,
    classifierModel: undefined,
    classifierTask: undefined,
    noClassifier: false,
  };

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      cfg.directory = arg;
      continue;
    }

    const eq = arg.indexOf('=');
    const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
    const spec = FLAG_SPEC[name];
    if (!spec) throw new Error(`Unknown flag: --${name}\nUsage: vibeguard ${command} [--help]`);

    const value = eq !== -1 ? arg.slice(eq + 1) : spec === 'value' ? argv[++i] : true;
    if (spec === 'value' && value === undefined) throw new Error(`Missing value for --${name}`);

    switch (name) {
      case 'deep':
        cfg.deep = true;
        break;
      case 'deps':
        cfg.depsOnly = true;
        break;
      case 'all':
        cfg.all = true;
        cfg.focus = [...ALL_DOMAINS];
        break;
      case 'focus':
        cfg.focus = String(value)
          .split(',')
          .map((s) => s.trim());
        break;
      case 'history-only':
        cfg.historyOnly = true;
        break;
      case 'staged':
        cfg.staged = true;
        break;
      case 'strict':
        cfg.strict = true;
        break;
      case 'format':
        cfg.format = value;
        break;
      case 'report':
        cfg.report = true;
        break;
      case 'interactive':
        cfg.interactive = true;
        break;
      case 'path':
        cfg.path = value;
        cfg.directory = value;
        break;
      case 'debounce':
        cfg.debounceMs = Number(value);
        break;
      case 'min-severity':
        cfg.minSeverity = value;
        break;
      case 'notify':
        cfg.notify = true;
        break;
      case 'commits':
        cfg.maxCommits = Number(value);
        break;
      case 'detect-secrets':
        cfg.detectSecrets = true;
        break;
      case 'check-performance':
        cfg.checkPerformance = true;
        break;
      case 'llm-url':
        cfg.llmUrl = value;
        break;
      case 'llm-model':
        cfg.llmModel = value;
        break;
      case 'llm-key':
        cfg.llmKey = value;
        break;
      case 'classifier-model':
        cfg.classifierModel = value;
        break;
      case 'classifier-task':
        cfg.classifierTask = value;
        break;
      case 'no-classifier':
        cfg.noClassifier = true;
        break;
    }
  }

  return cfg;
}

function createRegistryClient() {
  return {
    exists: async (name) => {
      const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.status === 404) return false;
      if (!res.ok) throw new Error(`registry returned ${res.status}`);
      return true;
    },
  };
}

function stagedFiles(cwd) {
  try {
    const out = execFileSync('git', ['diff', '--staged', '--name-only'], { cwd, encoding: 'utf8' });
    const files = out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    return files.length ? new Set(files) : null;
  } catch {
    return null;
  }
}

function htmlReport(report) {
  const rows = (report.findings ?? [])
    .map(
      (f) =>
        `<tr><td>${f.domain}</td><td>${f.severity}</td><td>${f.file}:${f.line}</td><td>${f.message}</td><td>${f.recommendation ?? ''}</td></tr>`,
    )
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><title>VibeGuard Report</title></head>
<body><h1>VibeGuard Audit Report — ${(report.findings ?? []).length} issues</h1>
<table border="1" cellspacing="0" cellpadding="6"><thead><tr><th>Domain</th><th>Severity</th><th>Location</th><th>Finding</th><th>Recommendation</th></tr></thead>
<tbody>${rows}</tbody></table></body></html>`;
}

async function emit(report, cfg, dir) {
  if (cfg.format === 'json') {
    process.stdout.write(JSON.stringify(toJson(report)) + '\n');
  } else if (cfg.format === 'sarif') {
    process.stdout.write(JSON.stringify(toSarif(report)) + '\n');
  } else {
    process.stdout.write(renderTerminal(report) + '\n');
  }
  if (cfg.report) {
    await writeFile(path.join(dir, 'vibeguard-report.html'), htmlReport(report), 'utf8');
  }
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const cfg = parseArgs(argv);
  const dir = cfg.directory ?? '.';
  const llm = deps.llm ?? (await loadLlm({ flags: cfg, cwd: dir }));
  const classifier =
    deps.classifier ?? loadClassifier({ flags: cfg, modelLoader: deps.classifierLoader });
  const registryClient = deps.registryClient ?? createRegistryClient();
  const notifier = deps.notifier ?? createNotifier();

  // MCP server mode — the globally installed CLI doubles as a stdio MCP
  // server (docs/04-mcp-server.md). stdout carries JSON-RPC only.
  if (cfg.command === 'mcp') {
    const server = createMcpServer({ llm, classifier, registryClient });
    const { done } = runStdioServer(server, {
      input: deps.input ?? process.stdin,
      output: deps.output ?? process.stdout,
    });
    return { server, done, exitCode: 0 };
  }

  if (cfg.command === 'watch') {
    const watcher = createWatcher({
      dir: cfg.path ?? dir,
      debounceMs: cfg.debounceMs ?? 1000,
      watcherFactory: deps.watcherFactory,
      onBatch: async (files) => {
        for (const f of files) {
          const report = await scanProject({
            directory: path.dirname(f),
            deep: false,
            llm,
            registryClient,
            focus: cfg.focus,
          });
          report.findings = severityAtLeast(report.findings, cfg.minSeverity ?? 'Low');
          process.stdout.write(renderTerminal(report) + '\n');
          if (cfg.notify && meetsBlocking(report.findings, 'High')) {
            notifier.notify({
              title: 'VibeGuard',
              message: `${report.findings.length} finding(s) in ${path.basename(f)} — worst: ${report.findings[0]?.severity}`,
            });
          }
        }
      },
      escalateOn: (files) => files.some((f) => shouldEscalate({ filePath: f })),
      onEscalate: async (files) => {
        for (const f of files) {
          const report = await scanProject({
            directory: path.dirname(f),
            deep: true,
            llm,
            registryClient,
            focus: cfg.focus,
          });
          report.findings = severityAtLeast(report.findings, cfg.minSeverity ?? 'Low');
          process.stdout.write(renderTerminal(report) + '\n');
          if (cfg.notify && meetsBlocking(report.findings, 'High')) {
            notifier.notify({
              title: 'VibeGuard',
              message: `${report.findings.length} finding(s) in ${path.basename(f)} — worst: ${report.findings[0]?.severity}`,
            });
          }
        }
      },
    });
    process.stdout.write(
      `VibeGuard watching ${cfg.path ?? dir} (debounce ${cfg.debounceMs ?? 1000}ms)\n`,
    );
    return { watcher, exitCode: 0 };
  }

  if (cfg.command === 'audit-history') {
    const findings = await auditHistory({
      cwd: dir,
      maxCommits: cfg.maxCommits,
      secretsOnly: cfg.detectSecrets,
      checkPerformance: cfg.checkPerformance,
      registryClient,
    });
    const report = { findings, history: { findings } };
    if (cfg.format === 'json' || cfg.format === 'sarif') {
      process.stdout.write(JSON.stringify({ history: { findings } }) + '\n');
    } else {
      await emit({ findings }, { ...cfg, report: false }, dir);
    }
    if (cfg.report)
      await writeFile(path.join(dir, 'vibeguard-report.html'), htmlReport(report), 'utf8');
    return { exitCode: cfg.strict && meetsBlocking(findings, cfg.minSeverity ?? 'High') ? 1 : 0 };
  }

  // check
  if (cfg.historyOnly) {
    const history = await auditHistory({
      cwd: dir,
      maxCommits: cfg.maxCommits,
      secretsOnly: cfg.detectSecrets,
      checkPerformance: cfg.checkPerformance,
      registryClient,
    });
    const report = { findings: [], history: { findings: history } };
    if (cfg.format === 'json') {
      process.stdout.write(JSON.stringify({ findings: [], history: { findings: history } }) + '\n');
    } else {
      await emit({ findings: history }, { ...cfg, report: false }, dir);
    }
    if (cfg.report)
      await writeFile(path.join(dir, 'vibeguard-report.html'), htmlReport(report), 'utf8');
    return { exitCode: 0 };
  }

  const report = await scanProject({
    directory: dir,
    deep: cfg.deep,
    depsOnly: cfg.depsOnly,
    llm,
    classifier,
    registryClient,
    focus: cfg.focus,
  });

  if (cfg.staged) {
    const staged = stagedFiles(dir);
    if (staged) {
      report.findings = report.findings.filter(
        (f) => staged.has(f.file) || staged.has(f.file?.replace(/^\.\//, '')),
      );
    }
  }

  await emit(report, cfg, dir);

  const blocking = meetsBlocking(report.findings, cfg.minSeverity ?? 'High');
  return { exitCode: cfg.strict && blocking ? 1 : 0 };
}

const invokedAsScript =
  process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url;

if (invokedAsScript) {
  main(process.argv.slice(2))
    .then((res) => {
      const code = typeof res === 'number' ? res : (res?.exitCode ?? 0);
      if (code !== 0) process.exitCode = code;
    })
    .catch((err) => {
      process.stderr.write(`vibeguard: ${err.message}\n`);
      process.exitCode = 1;
    });
}
