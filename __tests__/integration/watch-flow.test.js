// features/watch-mode.feature — watcher + debounce + escalation + notifications (injected fakes)
import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from '@jest/globals';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { createWatcher } from '../../src/watcher.js';
import { scanFile } from '../../src/scanner.js';
import { main } from '../../src/cli.js';
import { createMockLlm } from '../helpers/mockLlm.js';
import { createMockRegistry } from '../helpers/mockRegistry.js';
import { makeTmpDir, writeTmpFile, cleanup } from '../helpers/tmpProject.js';

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
    const watcher = createWatcher({
      dir: '/proj',
      onBatch,
      debounceMs: 1000,
      watcherFactory: factory,
    });

    emit('src/auth.ts');
    jest.advanceTimersByTime(1000);

    expect(onBatch).toHaveBeenCalledWith(expect.arrayContaining(['src/auth.ts']));
    await watcher.close();
  });

  // features/watch-mode.feature — "Ignored paths never trigger an audit"
  test('ignored paths never reach the audit queue', async () => {
    const { factory, emit } = makeFakeWatcherFactory();
    const onBatch = jest.fn();
    const watcher = createWatcher({
      dir: '/proj',
      onBatch,
      debounceMs: 1000,
      watcherFactory: factory,
    });

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
          scanFile({
            filePath,
            depth: 'full',
            llm,
            registryClient: { exists: async () => true },
          }).catch(() => ({ filePath, findings: [] })),
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

describe('watch mode — CLI wiring via main()', () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let dir, stdoutSpy;
  beforeAll(async () => {
    dir = await makeTmpDir();
    // each file in its own dir — onBatch scans path.dirname(changedFile)
    await writeTmpFile(dir, 'leak/leak.ts', `const key = "sk-proj-abc123def456";\n`);
    await writeTmpFile(dir, 'low/only-low.jsx', `export const A = () => <img src="x.png" />;\n`);
  });
  afterAll(async () => cleanup(dir));
  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });
  afterEach(() => stdoutSpy.mockRestore());

  const runWatch = (args, notifier) => {
    const { factory, emit } = makeFakeWatcherFactory();
    return {
      emit,
      ready: main(['watch', dir, '--debounce', '50', ...args], {
        watcherFactory: factory,
        notifier,
        llm: createMockLlm(),
        classifier: null,
        registryClient: createMockRegistry(['express', 'lodash']),
      }),
    };
  };

  // features/watch-mode.feature — "Severe finding fires a native OS notification"
  test('--notify fires the injected notifier on a High+ finding', async () => {
    const notifier = { notify: jest.fn() };
    const { emit, ready } = runWatch(['--notify'], notifier);
    const { watcher } = await ready;

    emit(path.join(dir, 'leak', 'leak.ts'));
    await sleep(250);

    expect(notifier.notify).toHaveBeenCalledWith(expect.objectContaining({ title: 'VibeGuard' }));
    await watcher.close();
  });

  // features/watch-mode.feature — "Watch with custom path, debounce, and severity filter"
  test('--min-severity high filters out Low findings before surfacing', async () => {
    const notifier = { notify: jest.fn() };
    const { emit, ready } = runWatch(['--notify', '--min-severity', 'high'], notifier);
    const { watcher } = await ready;

    emit(path.join(dir, 'low', 'only-low.jsx')); // only a Low a11y finding — must not notify
    await sleep(500);
    expect(notifier.notify).not.toHaveBeenCalled();

    emit(path.join(dir, 'leak', 'leak.ts')); // Critical secret — must notify
    await sleep(500);
    expect(notifier.notify).toHaveBeenCalled();
    await watcher.close();
  });
});
