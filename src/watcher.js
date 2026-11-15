// Watch mode — low-impact watcher, ignore filters, debounce, escalation
// (docs/05-watch-and-history.md).

const DEFAULT_IGNORES = [/(^|[\\/])node_modules([\\/]|$)/, /(^|[\\/])\.git([\\/]|$)/, /(^|[\\/])dist([\\/]|$)/];

const norm = (p) => p.replace(/\\/g, '/');

export function shouldIgnore(filePath, lists = {}) {
  const p = norm(filePath);
  if (DEFAULT_IGNORES.some((re) => re.test(p))) return true;

  const patterns = [...(lists.gitignore ?? []), ...(lists.vibeguardignore ?? [])];
  return patterns.some((pattern) => {
    const pat = norm(pattern).replace(/^\//, '');
    return p === pat || p.startsWith(pat) || p.includes(`/${pat.replace(/\/$/, '')}/`);
  });
}

export function createDebouncer(fn, ms) {
  let pending = [];
  let timer = null;

  const debounced = (item) => {
    pending.push(item);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const batch = pending;
      pending = [];
      timer = null;
      fn(batch);
    }, ms);
  };

  debounced.flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (pending.length) {
      const batch = pending;
      pending = [];
      fn(batch);
    }
  };

  return debounced;
}

const CRITICAL_FILE_RE = /(^|\/)\.env($|\.)|routes\/.*api|api\/routes|middleware.*auth|auth.*middleware|\.env/i;

export function shouldEscalate({ filePath = '', riskScore = 0, threshold = 0.8 } = {}) {
  if (riskScore >= threshold) return true;
  return CRITICAL_FILE_RE.test(norm(filePath));
}

export function createWatcher({
  dir,
  onBatch,
  debounceMs = 1000,
  watcherFactory,
  ignoreLists = {},
  escalateOn,
  onEscalate,
} = {}) {
  const dispatch = (batch) => {
    if (escalateOn && escalateOn(batch) && onEscalate) return onEscalate(batch);
    return onBatch(batch);
  };

  const debounced = createDebouncer(dispatch, debounceMs);
  const watcher = watcherFactory ? watcherFactory(dir) : null;

  const onChange = (filePath) => {
    if (!shouldIgnore(filePath, ignoreLists)) debounced(filePath);
  };

  if (watcher?.on) {
    watcher.on('change', onChange);
    watcher.on('add', onChange);
    watcher.on('unlink', onChange);
  }

  return {
    watcher,
    close: async () => {
      debounced.flush();
      await watcher?.close?.();
    },
  };
}
