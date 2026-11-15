// Git-history audit — scan past commits for leaked secrets and hallucinated
// dependencies (docs/05-watch-and-history.md).

import { execFileSync } from 'node:child_process';
import { shannonEntropy } from '../layers/probabilistic.js';
import { classifyFinding } from '../severity.js';

const HISTORY_SECRET_RES = [
  /sk-[A-Za-z0-9_-]{8,}/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[A-Za-z0-9]{20,}/,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /(?:postgres|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s'"]+:[^\s'"]+@/i,
  /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"`]?[^'"`\s]{8,}/i,
];

const SECRET_REWRITE_ADVICE =
  'Remove the value from history with git filter-repo or BFG Repo-Cleaner, then revoke the key immediately.';

const COMMON_PACKAGES = new Set([
  'lodash', 'express', 'react', 'react-dom', 'next', 'axios', 'moment', 'chalk',
  'commander', 'typescript', 'jest', 'vitest', 'eslint', 'prettier', 'zod',
  'uuid', 'dotenv', 'cors', 'jsonwebtoken', 'bcrypt', 'fs-extra', 'glob',
  'yargs', 'inquirer', 'ora', 'node-fetch', 'ws', 'socket.io', 'mongoose',
]);

const SUSPICIOUS_TOKENS = /quantum|ultra|hyper|turbo-?ai|magic-?ai|gpt-?kit|super-?ai|neural-?x/i;

function isSecretCategory(category) {
  return /secret|env|key|credential|token|entropy/i.test(category);
}

export async function auditHistory({ cwd = '.', maxCommits, secretsOnly = false, registryClient } = {}) {
  let log;
  try {
    const args = ['log', '-p', '--no-color', '--no-ext-diff'];
    if (maxCommits) args.push('-n', String(maxCommits));
    log = execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return [];
  }

  const findings = [];
  let commit = null;
  let file = null;
  let newLine = 0;

  const push = (f) => findings.push(f);

  for (const raw of log.split('\n')) {
    const c = /^commit\s+([0-9a-f]{40})/.exec(raw);
    if (c) {
      commit = c[1];
      file = null;
      continue;
    }

    const f = /^\+\+\+\s+b\/(.+)/.exec(raw);
    if (f) {
      file = f[1];
      continue;
    }

    const h = /^@@\s+-\d+(?:,\d+)?\s+\+(\d+)/.exec(raw);
    if (h) {
      newLine = Number(h[1]) - 1;
      continue;
    }

    if (raw.startsWith('+') && !raw.startsWith('+++')) {
      newLine += 1;
      const content = raw.slice(1);

      // Secret signatures on added lines
      if (HISTORY_SECRET_RES.some((re) => re.test(content)) || /\.env$/.test(file ?? '')) {
        if (HISTORY_SECRET_RES.some((re) => re.test(content)) || /(KEY|SECRET|TOKEN|PASSWORD|URL)\s*=/.test(content)) {
          push({
            ruleId: 'VG-HIST-001',
            domain: 'SECURITY',
            category: 'Exposed secret',
            severity: classifyFinding({ category: 'Exposed secret' }),
            commit,
            file,
            line: newLine,
            message: `Secret value committed to history in ${file}:${newLine}.`,
            recommendation: SECRET_REWRITE_ADVICE,
          });
          continue;
        }
      }

      // High-entropy literals
      const lit = /['"`]([A-Za-z0-9+/=_-]{20,})['"`]/.exec(content);
      if (lit && shannonEntropy(lit[1]) > 4.2 && /[A-Z]/.test(lit[1]) && /\d/.test(lit[1])) {
        push({
          ruleId: 'VG-HIST-002',
          domain: 'SECURITY',
          category: 'High-entropy string',
          severity: classifyFinding({ category: 'High-entropy string' }),
          commit,
          file,
          line: newLine,
          message: `High-entropy string committed to history — probable secret.`,
          recommendation: SECRET_REWRITE_ADVICE,
        });
        continue;
      }

      // Hallucinated dependencies in manifest diffs
      if (/package\.json$/.test(file ?? '')) {
        const depRe = /"([^"@/\s][^"]*)"\s*:\s*"[^"]*"/g;
        for (const dep of content.matchAll(depRe)) {
          const name = dep[1];
          if (name.startsWith('_') || name === 'name' || name === 'version') continue;
          const suspicious = !COMMON_PACKAGES.has(name) && SUSPICIOUS_TOKENS.test(name);
          let unknown = false;
          if (registryClient && !COMMON_PACKAGES.has(name)) {
            try {
              unknown = !(await registryClient.exists(name));
            } catch {
              unknown = false;
            }
          }
          if (suspicious || unknown) {
            push({
              ruleId: 'VG-HIST-003',
              domain: 'SECURITY',
              category: 'Hallucinated package',
              severity: classifyFinding({ category: 'Hallucinated package' }),
              commit,
              file,
              line: newLine,
              message: `Dependency "${name}" added in this commit is absent from the package registry — possible AI hallucination (dependency confusion risk).`,
              recommendation: `Verify "${name}" — remove it or replace it with a published package, then rewrite history with git filter-repo or BFG Repo-Cleaner if needed.`,
            });
          }
        }
      }
    } else if (!raw.startsWith('-')) {
      newLine += 1; // context lines advance the new-file counter too
    }
  }

  return secretsOnly ? findings.filter((f) => isSecretCategory(f.category)) : findings;
}
