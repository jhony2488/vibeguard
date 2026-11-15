// features/git-history-audit.feature — historical secrets, hallucinated deps, mitigation report
import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';

jest.setTimeout(30000); // real git init/commits can be slow on CI/Windows
import { execFileSync } from 'node:child_process';
import { auditHistory } from '../../src/git/history.js';
import { makeTmpDir, writeTmpFile, cleanup } from '../helpers/tmpProject.js';

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8' });

let dir;
beforeAll(async () => {
  dir = await makeTmpDir('vibeguard-hist-');
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'test@vibeguard.dev']);
  git(dir, ['config', 'user.name', 'VibeGuard Test']);
  git(dir, ['config', 'commit.gpgsign', 'false']); // temp-repo only: host env enforces SSH signing

  // Commit 1: introduces a leaked secret + a hallucinated dependency
  await writeTmpFile(dir, '.env', 'OPENAI_API_KEY=sk-proj-hist123leak456\n');
  await writeTmpFile(
    dir,
    'package.json',
    JSON.stringify({
      name: 'hist-fixture',
      dependencies: { 'react-quantum-hooks': '^1.0.0', lodash: '*' },
    }),
  );
  git(dir, ['add', '.']);
  git(dir, ['commit', '-qm', 'add env and deps']);

  // Commit 2: removes the secret — still must be found in history
  await writeTmpFile(dir, '.env', '');
  git(dir, ['add', '.']);
  git(dir, ['commit', '-qm', 'remove env values']);

  // Commit 3: introduces performance debt (namespace import)
  await writeTmpFile(
    dir,
    'src/heavy.js',
    "import * as _ from 'lodash';\nexport const pick = _.pick;\n",
  );
  git(dir, ['add', '.']);
  git(dir, ['commit', '-qm', 'add heavy import']);
});
afterAll(async () => cleanup(dir));

describe('auditHistory — historical leak detection', () => {
  // features/git-history-audit.feature — "Detect credentials committed in the past"
  test('finds a secret that was committed and later removed', async () => {
    const findings = await auditHistory({ cwd: dir });

    const f = findings.find((x) =>
      /sk-proj-hist123leak456|secret|env/i.test(x.message + (x.match ?? '')),
    );
    expect(f).toBeDefined();
    expect(f.commit).toMatch(/^[0-9a-f]{7,40}$/);
    expect(f.line).toBeGreaterThan(0);
  });

  // features/git-history-audit.feature — "Detect hallucinated packages introduced by old commits"
  test('flags a nonexistent package introduced by an old commit', async () => {
    const findings = await auditHistory({ cwd: dir });

    const f = findings.find((x) => /react-quantum-hooks/.test(x.message));
    expect(f).toBeDefined();
    expect(f.category).toBe('Hallucinated package');
  });

  // features/git-history-audit.feature — "Mitigation report for a historical leak"
  test('the report suggests history rewrite and immediate revocation', async () => {
    const findings = await auditHistory({ cwd: dir });
    const secret = findings.find((x) => /env|secret|key/i.test(x.category + x.message));

    expect(secret.recommendation).toMatch(/filter-repo|BFG/i);
    expect(secret.recommendation).toMatch(/revoke/i);
  });

  // features/git-history-audit.feature — "Limit the historical scan depth"
  test('--commits limits the scanned depth', async () => {
    const findings = await auditHistory({ cwd: dir, maxCommits: 1 });

    const commits = new Set(findings.map((f) => f.commit).filter(Boolean));
    expect(commits.size).toBeLessThanOrEqual(1);
  });

  // features/git-history-audit.feature — "Secrets-focused historical scan"
  test('secretsOnly filters out non-secret findings', async () => {
    const findings = await auditHistory({ cwd: dir, secretsOnly: true });

    expect(findings.every((f) => /secret|env|key|credential/i.test(f.category + f.message))).toBe(
      true,
    );
  });

  // features/git-history-audit.feature — "Historical scan for performance and accessibility debt"
  test('checkPerformance reports perf debt introduced by a commit', async () => {
    const findings = await auditHistory({ cwd: dir, checkPerformance: true });

    const perf = findings.find((f) => f.ruleId === 'VG-PERF-002');
    expect(perf).toBeDefined();
    expect(perf.domain).toBe('PERFORMANCE');
    expect(perf.commit).toMatch(/^[0-9a-f]{7,40}$/);
    expect(perf.file).toBe('src/heavy.js');
  });

  test('without checkPerformance no perf findings are produced', async () => {
    const findings = await auditHistory({ cwd: dir });

    expect(findings.some((f) => f.domain === 'PERFORMANCE')).toBe(false);
  });
});
