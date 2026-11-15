// Scan orchestration — walks a project and runs the layered pipeline
// (docs/02-architecture.md). LLM and registry are injected; the semantic
// layer only runs on flagged files unless `deep` is set.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { analyzeDeterministic, checkDependencies } from './layers/deterministic.js';
import { estimateDataFlow } from './layers/probabilistic.js';
import { auditSemantic } from './layers/semantic.js';
import { createLocalEchoLlm } from './layers/llm.js';
import { classifyStrings } from './layers/classifier.js';
import { buildCodeModel } from './analyzers/codeModel.js';
import { checkA11y } from './a11y.js';
import { checkPerformance } from './performance.js';
import { shouldIgnore } from './watcher.js';
import { sanitizeSnippet } from './sanitize.js';

const SCAN_EXTENSIONS = new Set(['.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs', '.json', '.env', '.yaml', '.yml', '.html', '.css']);

const FOCUS_DOMAINS = { security: 'SECURITY', perf: 'PERFORMANCE', a11y: 'A11y' };

function normalizeFocus(focus) {
  if (!focus || focus.includes('all')) return ['SECURITY', 'PERFORMANCE', 'A11y'];
  return focus.map((f) => FOCUS_DOMAINS[f] ?? f);
}

async function* walk(dir, lists) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = entry.name;
    if (entry.isDirectory()) {
      if (!shouldIgnore(rel + '/', lists)) yield* walk(path.join(dir, rel), lists);
    } else {
      const relPath = path.join(dir, rel);
      if (!shouldIgnore(relPath, lists)) yield relPath;
    }
  }
}

function analyzeFile(code, ctx) {
  const domains = ctx.domains;
  const findings = [];

  if (domains.includes('SECURITY')) {
    findings.push(...analyzeDeterministic(code, ctx));
    findings.push(...estimateDataFlow(code, ctx));
  }
  if (domains.includes('A11y')) findings.push(...checkA11y(code, ctx));
  if (domains.includes('PERFORMANCE')) findings.push(...checkPerformance(code, ctx));

  return findings;
}

function detectFramework(manifest) {
  const deps = { ...(manifest?.dependencies ?? {}), ...(manifest?.devDependencies ?? {}) };
  return deps.next ? 'next' : undefined;
}

export async function scanFile({ filePath, depth = 'fast', llm, classifier, focus, language } = {}) {
  const code = await readFile(filePath, 'utf8');
  const domains = normalizeFocus(focus);
  const ctx = { filePath, language: language ?? path.extname(filePath).slice(1), domains };

  let findings = analyzeFile(code, ctx);

  if (classifier && domains.includes('SECURITY')) {
    const model = buildCodeModel(code, ctx);
    findings.push(...(await classifyStrings({ strings: model.strings, classifier, filePath })));
  }

  if (depth === 'full' && llm) {
    const payload = {
      filePath,
      code: llm.provider === 'remote' ? sanitizeSnippet(code).code : code,
      findings,
    };
    findings = await llm.audit(payload);
  }

  return { filePath, findings };
}

export async function scanProject({
  directory = '.',
  deep = false,
  llm = createLocalEchoLlm(),
  classifier,
  registryClient,
  focus,
  ignore,
  maxFiles = 5000,
} = {}) {
  const domains = normalizeFocus(focus);
  const lists = { gitignore: [], vibeguardignore: [], ...(ignore ?? {}) };
  const findings = [];
  const audited = [];
  let filesScanned = 0;

  let manifest = null;
  for await (const filePath of walk(directory, lists)) {
    const ext = path.extname(filePath);
    const rel = path.relative(directory, filePath).replace(/\\/g, '/');

    if (path.basename(filePath) === 'package.json') {
      try {
        manifest = JSON.parse(await readFile(filePath, 'utf8'));
      } catch {
        manifest = null;
      }
    }

    if (!SCAN_EXTENSIONS.has(ext) && path.basename(filePath) !== '.env') continue;
    if (++filesScanned > maxFiles) break;

    const code = await readFile(filePath, 'utf8');
    const ctx = { filePath: rel, language: ext.slice(1) || 'dotenv', domains, framework: detectFramework(manifest) };

    let fileFindings = analyzeFile(code, ctx);

    if (classifier && domains.includes('SECURITY')) {
      const model = buildCodeModel(code, ctx);
      fileFindings.push(...(await classifyStrings({ strings: model.strings, classifier, filePath: rel })));
    }

    const shouldAudit = deep ? true : fileFindings.length > 0;
    if (shouldAudit && llm && domains.includes('SECURITY')) {
      fileFindings = await auditSemantic({ filePath: rel, code, findings: fileFindings, llm });
      audited.push(rel);
    }

    findings.push(...fileFindings);
  }

  if (manifest && registryClient && domains.includes('SECURITY')) {
    findings.push(...(await checkDependencies(manifest, { registryClient })));
  }

  return { directory, filesScanned, auditedFiles: audited, findings };
}
