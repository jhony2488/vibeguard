// features/probabilistic-scan.feature — pluggable local models (HF classifiers/embeddings)
import { describe, test, expect, jest } from '@jest/globals';
import {
  createLocalClassifier,
  cosineSimilarity,
  classifyStrings,
  loadClassifier,
} from '../../src/layers/classifier.js';

const fakeTextPipe = jest.fn(async () => [{ label: 'SECRET', score: 0.91 }]);
const fakeTokenPipe = jest.fn(async () => [
  { entity: 'B-KEY', score: 0.95, start: 10, end: 34 },
  { entity: 'O', score: 0.4 },
]);
const fakeEmbedPipe = jest.fn(async () => ({ data: new Float32Array([1, 0, 0.5]) }));

const loaderFor = (pipe) => jest.fn(async () => pipe);

describe('createLocalClassifier — pluggable HF models', () => {
  test('requires a model id', () => {
    expect(() => createLocalClassifier({})).toThrow(/model/);
  });

  test('rejects unknown tasks', () => {
    expect(() => createLocalClassifier({ model: 'x', task: 'magic' })).toThrow(/task/i);
  });

  test('classify returns the label/score above threshold', async () => {
    const modelLoader = loaderFor(fakeTextPipe);
    const clf = createLocalClassifier({ model: 'secret-detector', modelLoader });

    const hit = await clf.classify('sk-proj-abc123def456');
    expect(hit).toEqual({ label: 'SECRET', score: 0.91 });
    expect(modelLoader).toHaveBeenCalledWith('text-classification', 'secret-detector');
    expect(fakeTextPipe).toHaveBeenCalledWith('sk-proj-abc123def456');
  });

  test('classify returns null below the confidence threshold', async () => {
    const clf = createLocalClassifier({
      model: 'm',
      modelLoader: loaderFor(jest.fn(async () => [{ label: 'SECRET', score: 0.3 }])),
      threshold: 0.7,
    });
    expect(await clf.classify('anything')).toBeNull();
  });

  test('classifyTokens filters entities by threshold', async () => {
    const clf = createLocalClassifier({
      model: 'secret-ner',
      task: 'token-classification',
      modelLoader: loaderFor(fakeTokenPipe),
    });

    const spans = await clf.classifyTokens('const k = "sk-proj-abc123def456";');
    expect(spans).toHaveLength(1);
    expect(spans[0].entity).toBe('B-KEY');
  });

  test('embed returns a numeric vector', async () => {
    const clf = createLocalClassifier({
      model: 'code-embedder',
      task: 'feature-extraction',
      modelLoader: loaderFor(fakeEmbedPipe),
    });

    const vec = await clf.embed('function f() {}');
    expect(vec.length).toBe(3);
    expect(vec[0]).toBeCloseTo(1);
  });

  test('pipeline is lazily loaded once', async () => {
    const modelLoader = loaderFor(fakeTextPipe);
    const clf = createLocalClassifier({ model: 'm', modelLoader });

    await clf.classify('a'.repeat(9));
    await clf.classify('b'.repeat(9));
    expect(modelLoader).toHaveBeenCalledTimes(1);
  });
});

describe('cosineSimilarity — embedding comparison', () => {
  test('identical vectors score 1, orthogonal score 0', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe('classifyStrings — Layer 2.5 integration', () => {
  test('positive labels become findings with file/line', async () => {
    const clf = createLocalClassifier({ model: 'm', modelLoader: loaderFor(fakeTextPipe) });
    const strings = [
      { value: 'sk-proj-abc123def456', line: 3 },
      { value: 'hi', line: 4 }, // too short — skipped
    ];

    const findings = await classifyStrings({ strings, classifier: clf, filePath: 'a.ts' });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ file: 'a.ts', line: 3, domain: 'SECURITY' });
    expect(findings[0].message).toContain('SECRET');
  });
});

describe('loadClassifier — config resolution', () => {
  test('returns null without a model', () => {
    expect(loadClassifier({ flags: {}, env: {} })).toBeNull();
  });

  test('returns null with --no-classifier even when a model is set', () => {
    expect(loadClassifier({ flags: { noClassifier: true, classifierModel: 'x' }, env: {} })).toBeNull();
  });

  test('builds a classifier from flags', () => {
    const clf = loadClassifier({
      flags: { classifierModel: 'secret-detector', classifierTask: 'token-classification' },
      env: {},
      modelLoader: loaderFor(fakeTokenPipe),
    });
    expect(clf.model).toBe('secret-detector');
    expect(clf.task).toBe('token-classification');
  });

  test('env fallback for model id', () => {
    const clf = loadClassifier({ flags: {}, env: { VIBEGUARD_CLASSIFIER_MODEL: 'env-model' } });
    expect(clf.model).toBe('env-model');
  });
});
