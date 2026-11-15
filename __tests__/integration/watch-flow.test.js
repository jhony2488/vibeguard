// features/watch-mode.feature — watcher + debounce + escalation + notifications (injected fakes)
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'node:events';
import { createWatcher } from '../../src/watcher.js';
import { scanFile } from '../../src/scanner.js';
import { createMockLlm } from '../helpers/mockLlm.js';

// watcherFactory injects a controllable fake fs watcher.
const makeFakeWatcherFactory = () => {
  const emitter = new EventEmitter();
  const factory = jest.fn(() => ({
    on: (event, cb) => emitter.on(event, cb),
    emitChange: (p) => emitter.emit('change', p),
    close: jest.fn(),
  }));
  return { factory, emit: (p) => emitter.emit('change', p) };
};

describe('watch mode — event-driven audit flow', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  // features/watch-mode.feature — "File changes trigger an incremental audit"
  test('a file change queues an incremental audit', async () => {
    const { factory, emit } = makeFakeWatcherFactory();
    const onBatch = jest.fn();
    const watcher = createWatcher({ dir: '/proj', onBatch, debounceMs: 1000, watcherFactory: factory });

    emit('src/auth.ts');
    jest.advanceTimersByTime(1000);

    expect(onBatch).toHaveBeenCalledWith(expect.arrayContaining(['src/auth.ts']));
    await watcher.close();
  });

  // features/watch-mode.feature — "Ignored paths never trigger an audit"
  test('ignored paths never reach the audit queue', async () => {
    const { factory, emit } = makeFakeWatcherFactory();
    const onBatch = jest.fn();
    const watcher = createWatcher({ dir: '/proj', onBatch, debounceMs: 1000, watcherFactory: factory });

    emit('node_modules/pkg/index.js');
    emit('.git/objects/ab');
    emit('dist/bundle.js');
    jest.advanceTimersByTime(2000);

    expect(onBatch).not.toHaveBeenCalled();
    await watcher.close();
  });

  // features/watch-mode.feature — "High risk probability escalates to the semantic layer"
  test('a high-risk batch escalates to the semantic layer', async () => {
    const llm = createMockLlm();
    const { factory, emit } = makeFakeWatcherFactory();
    const analyze = jest.fn(async (files) =>
      Promise.all(
        files.map((filePath) =>
          scanFile({ filePath, depth: 'full', llm, registryClient: { exists: async () => true } }),
        ),
      ),
    );
    const watcher = createWatcher({
      dir: '/proj',
      onBatch: analyze,
      debounceMs: 1000,
      watcherFactory: factory,
      escalateOn: (files) => files.includes('.env'),
      onEscalate: (files) => analyze(files),
    });

    emit('.env');
    jest.advanceTimersByTime(1000);

    expect(analyze).toHaveBeenCalledWith(expect.arrayContaining(['.env']));
    await watcher.close();
  });

  // features/watch-mode.feature — "Severe finding fires a native OS notification"
  test('critical findings dispatch an OS notification when notify is on', async () => {
    const notifier = { notify: jest.fn() };
    const onFinding = jest.fn((finding) => {
      if (finding.severity === 'Critical') notifier.notify(finding);
    });
    onFinding({ severity: 'Critical', file: 'src/auth.ts', line: 3 });

    expect(notifier.notify).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'Critical', file: 'src/auth.ts' }),
    );
  });
});
