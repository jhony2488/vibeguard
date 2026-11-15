// features/cli-commands.feature + features/severity.feature — end-to-end CLI subprocess runs
import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';

jest.setTimeout(30000); // subprocess spawns + cold registry timeouts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFixtureProject, cleanup } from '../helpers/tmpProject.js';

const execFileP = promisify(execFile);
const CLI = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/cli.js',
);

let dir;
beforeAll(async () => {
  dir = await copyFixtureProject('vulnerable-project');
});
afterAll(async () => cleanup(dir));

const run = (args) => execFileP('node', [CLI, ...args], { cwd: dir });

describe('vibeguard check — subprocess flows', () => {
  // features/cli-commands.feature — "JSON output for CI consumption"
  test('--format json prints parseable findings to stdout', async () => {
    const { stdout } = await run(['check', '--format', 'json']);
    const report = JSON.parse(stdout);

    expect(Array.isArray(report.findings)).toBe(true);
    expect(report.findings[0]).toMatchObject({
      file: expect.any(String),
      line: expect.any(Number),
      severity: expect.any(String),
      recommendation: expect.any(String),
    });
  });

  // features/cli-commands.feature — "Static report file generation"
  test('--report writes vibeguard-report.html to the project dir', async () => {
    await run(['check', '--report']);
    await expect(access(path.join(dir, 'vibeguard-report.html'))).resolves.toBeUndefined();
  });

  // features/cli-commands.feature — "Scoped audit on specific domains"
  test('--focus=perf,a11y reports only perf/a11y findings', async () => {
    const { stdout } = await run(['check', '--focus=perf,a11y', '--format', 'json']);
    const report = JSON.parse(stdout);

    expect(report.findings.every((f) => ['PERFORMANCE', 'A11y'].includes(f.domain))).toBe(true);
    expect(report.findings.length).toBeGreaterThan(0);
  });

  // features/severity.feature — "Strict mode fails the run on disallowed severities"
  test('--staged --strict exits non-zero when blocking findings exist', async () => {
    await expect(run(['check', '--staged', '--strict'])).rejects.toMatchObject({
      code: expect.any(Number),
    });
    try {
      await run(['check', '--staged', '--strict']);
    } catch (err) {
      expect(err.code).not.toBe(0);
    }
  });

  // features/cli-commands.feature — "History-only scan"
  test('--history-only runs only the git-history path', async () => {
    const { stdout } = await run(['check', '--history-only', '--format', 'json']);
    const report = JSON.parse(stdout);
    expect(report).toHaveProperty('history');
  });
});
