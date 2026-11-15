// features/watch-mode.feature — ignore filters, debounce, escalation
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { shouldIgnore, createDebouncer, shouldEscalate } from '../../src/watcher.js';

describe('watcher ignore filters', () => {
  // features/watch-mode.feature — "Ignored paths never trigger an audit"
  test.each([
    'node_modules/pkg/index.js',
    '.git/objects/abc123',
    'dist/bundle.js',
  ])('ignores %s', (p) => {
    expect(shouldIgnore(p, {})).toBe(true);
  });

  test('ignores files covered by .gitignore and .vibeguardignore', () => {
    const lists = { gitignore: ['coverage/'], vibeguardignore: ['docs/generated/'] };
    expect(shouldIgnore('coverage/lcov.info', lists)).toBe(true);
    expect(shouldIgnore('docs/generated/api.md', lists)).toBe(true);
  });

  test('does not ignore regular source files', () => {
    expect(shouldIgnore('src/app.ts', {})).toBe(false);
  });
});

describe('debounce buffer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  // features/watch-mode.feature — "Rapid successive saves collapse into one audit"
  test('collapses rapid saves into a single audit after the pause', () => {
    const onBatch = jest.fn();
    const debounced = createDebouncer(onBatch, 1000);

    debounced('src/a.ts');
    jest.advanceTimersByTime(500);
    debounced('src/a.ts');
    jest.advanceTimersByTime(500);
    debounced('src/b.ts');
    jest.advanceTimersByTime(1000);

    expect(onBatch).toHaveBeenCalledTimes(1);
    expect(onBatch).toHaveBeenCalledWith(expect.arrayContaining(['src/a.ts', 'src/b.ts']));
  });

  test('triggers again after a quiet period', () => {
    const onBatch = jest.fn();
    const debounced = createDebouncer(onBatch, 1000);

    debounced('src/a.ts');
    jest.advanceTimersByTime(1000);
    debounced('src/c.ts');
    jest.advanceTimersByTime(1000);

    expect(onBatch).toHaveBeenCalledTimes(2);
  });
});

describe('layer escalation in watch mode', () => {
  // features/watch-mode.feature — "High risk probability escalates to the semantic layer"
  test('escalates when risk probability crosses the threshold', () => {
    expect(shouldEscalate({ filePath: 'src/x.ts', riskScore: 0.9, threshold: 0.8 })).toBe(true);
    expect(shouldEscalate({ filePath: 'src/x.ts', riskScore: 0.3, threshold: 0.8 })).toBe(false);
  });

  // features/watch-mode.feature — "Changes to critical files escalate automatically"
  test.each(['.env', 'src/routes/api.ts', 'src/middleware/auth.ts'])(
    'escalates automatically for %s',
    (filePath) => {
      expect(shouldEscalate({ filePath, riskScore: 0, threshold: 1 })).toBe(true);
    },
  );
});
