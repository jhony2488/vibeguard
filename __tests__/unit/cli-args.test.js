// features/cli-commands.feature — flag parsing into run configuration
import { describe, test, expect } from '@jest/globals';
import { parseArgs } from '../../src/cli.js';

describe('CLI argument parsing', () => {
  // features/cli-commands.feature — "Default scan audits the current directory"
  test('bare check targets the current directory with default mode', () => {
    const cfg = parseArgs(['check']);
    expect(cfg.command).toBe('check');
    expect(cfg.directory).toBe('.');
    expect(cfg.deep).toBe(false);
  });

  // features/cli-commands.feature — "Deep audit forces the LLM semantic pass"
  test('--deep enables the semantic pass', () => {
    expect(parseArgs(['check', '--deep']).deep).toBe(true);
  });

  // features/cli-commands.feature — "Dependency-focused scan"
  test('--deps scopes to the dependency tree', () => {
    expect(parseArgs(['check', '--deps']).depsOnly).toBe(true);
  });

  // features/cli-commands.feature — "Combined audit across all domains"
  test('--all enables security + a11y + performance', () => {
    const cfg = parseArgs(['check', '--all']);
    expect(cfg.focus).toEqual(expect.arrayContaining(['security', 'perf', 'a11y']));
  });

  // features/cli-commands.feature — "Scoped audit on specific domains"
  test('--focus=perf,a11y scopes the run', () => {
    const cfg = parseArgs(['check', '--focus=perf,a11y']);
    expect(cfg.focus).toEqual(['perf', 'a11y']);
  });

  // features/cli-commands.feature — "History-only scan"
  test('--history-only limits the run to git history', () => {
    expect(parseArgs(['check', '--history-only']).historyOnly).toBe(true);
  });

  // features/cli-commands.feature — "Strict scan of staged changes for CI"
  test('--staged --strict sets CI gate mode', () => {
    const cfg = parseArgs(['check', '--staged', '--strict']);
    expect(cfg.staged).toBe(true);
    expect(cfg.strict).toBe(true);
  });

  // features/cli-commands.feature — output modes
  test('--format json selects machine output', () => {
    expect(parseArgs(['check', '--format', 'json']).format).toBe('json');
  });

  test('--report enables static report generation', () => {
    expect(parseArgs(['check', '--report']).report).toBe(true);
  });

  // features/watch-mode.feature — watch flags
  test('watch parses path, debounce and severity filter', () => {
    const cfg = parseArgs(['watch', '--path', './src', '--debounce', '1000', '--min-severity', 'high']);
    expect(cfg.command).toBe('watch');
    expect(cfg.path).toBe('./src');
    expect(cfg.debounceMs).toBe(1000);
    expect(cfg.minSeverity).toBe('high');
  });

  test('--notify enables OS notifications', () => {
    expect(parseArgs(['watch', '--notify']).notify).toBe(true);
  });

  // features/git-history-audit.feature — history flags
  test('audit-history parses commits limit and secrets scope', () => {
    const cfg = parseArgs(['audit-history', '--commits', '100', '--detect-secrets']);
    expect(cfg.command).toBe('audit-history');
    expect(cfg.maxCommits).toBe(100);
    expect(cfg.detectSecrets).toBe(true);
  });

  test('unknown flags are rejected with a usage error', () => {
    expect(() => parseArgs(['check', '--nope'])).toThrow(/unknown|usage/i);
  });
});
