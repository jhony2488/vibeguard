// Pluggable local models — Hugging Face classifiers & embeddings that run
// fully on-device via @xenova/transformers (optional dependency, lazy-loaded).
//
// Contract: { classify, classifyTokens, embed, model, task, provider: 'local' }
// The modelLoader is injectable so tests never download real weights.

export const CLASSIFIER_TASKS = [
  'text-classification',
  'token-classification',
  'feature-extraction',
];

const DEFAULT_THRESHOLD = 0.7;

async function defaultModelLoader(task, model) {
  let transformers;
  try {
    transformers = await import('@xenova/transformers');
  } catch {
    throw new Error(
      'Local classifiers require the optional dependency "@xenova/transformers". Install it with: npm install @xenova/transformers',
    );
  }
  return transformers.pipeline(task, model);
}

export function createLocalClassifier({
  model,
  task = 'text-classification',
  modelLoader = defaultModelLoader,
  threshold = DEFAULT_THRESHOLD,
} = {}) {
  if (!model) throw new Error('createLocalClassifier requires a model id');
  if (!CLASSIFIER_TASKS.includes(task)) {
    throw new Error(`Unknown classifier task "${task}" — expected one of: ${CLASSIFIER_TASKS.join(', ')}`);
  }

  let pipePromise = null;
  const pipe = () => (pipePromise ??= modelLoader(task, model));

  return {
    provider: 'local',
    model,
    task,

    // Whole-text classification → {label, score} or null below threshold.
    async classify(text) {
      const p = await pipe();
      const out = await p(text);
      const best = Array.isArray(out) ? out[0] : out;
      if (!best || (best.score ?? 0) < threshold) return null;
      return { label: best.label, score: best.score };
    },

    // Token classification (NER-style) → spans above threshold.
    async classifyTokens(text) {
      const p = await pipe();
      const out = await p(text);
      const items = Array.isArray(out) ? out : [out];
      return items.filter((t) => (t.score ?? 0) >= threshold);
    },

    // Embeddings — returns the raw vector for similarity work.
    async embed(text) {
      const p = await pipe();
      const out = await p(text, { pooling: 'mean', normalize: true });
      return Array.from(out.data ?? out);
    },
  };
}

export function cosineSimilarity(a = [], b = []) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

// Applies a classifier over string literals of a file — the Layer-2.5 hook
// consumed by the scanner. Positive labels become findings.
export async function classifyStrings({ strings = [], classifier, filePath, negativeLabel }) {
  const findings = [];
  for (const s of strings) {
    if (s.value.length < 8) continue;
    const hit = await classifier.classify(s.value);
    if (!hit || (negativeLabel && hit.label === negativeLabel)) continue;
    findings.push({
      ruleId: 'VG-CLS-001',
      domain: 'SECURITY',
      category: `Classifier: ${hit.label}`,
      severity: 'Medium',
      file: filePath,
      line: s.line,
      message: `Local model "${classifier.model}" flagged this string as "${hit.label}" (${(hit.score * 100).toFixed(0)}% confidence).`,
      recommendation: 'Review the flagged literal — local model detections are heuristic.',
    });
  }
  return findings;
}

export function loadClassifier({ flags = {}, env = process.env, modelLoader } = {}) {
  if (flags.noClassifier) return null;
  const model = flags.classifierModel ?? env.VIBEGUARD_CLASSIFIER_MODEL;
  if (!model) return null;
  const task = flags.classifierTask ?? env.VIBEGUARD_CLASSIFIER_TASK ?? 'text-classification';
  return createLocalClassifier({ model, task, modelLoader });
}
