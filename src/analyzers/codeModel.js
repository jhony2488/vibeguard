// Swappable code-model seam.
//
// v0: regex/heuristic model built from source text. A future AST-backed
// implementation (e.g. @babel/parser) can replace `buildCodeModel` as long as
// the returned shape is preserved — every layer consumes this contract.

export function buildCodeModel(code, ctx = {}) {
  const lines = code.split('\n');
  const strings = [];
  const calls = [];
  const jsxElements = [];
  const imports = [];

  const stringRe = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
  const callRe = /([A-Za-z_$][\w$]*(?:\.[\w$]+)*)\s*\(/g;
  const jsxRe = /<([a-zA-Z][\w-]*)((?:\s+[\w-]+(?:=\{[^}]*\}|="[^"]*"|='[^']*'|=[^\s>]*)?)*)\s*\/?>/g;
  const importRe = /import\s+([^'"]+?)\s+from\s+['"]([^'"]+)['"]/g;

  lines.forEach((lineText, i) => {
    const line = i + 1;

    let m;
    stringRe.lastIndex = 0;
    while ((m = stringRe.exec(lineText)) !== null) {
      strings.push({ value: m[2], line, raw: m[0] });
    }

    callRe.lastIndex = 0;
    while ((m = callRe.exec(lineText)) !== null) {
      calls.push({ name: m[1], line });
    }

    jsxRe.lastIndex = 0;
    while ((m = jsxRe.exec(lineText)) !== null) {
      jsxElements.push({ tag: m[1], attrs: parseJsxAttrs(m[2]), attrsRaw: m[2], line });
    }

    importRe.lastIndex = 0;
    while ((m = importRe.exec(lineText)) !== null) {
      imports.push({ imported: m[1].trim(), specifier: m[2], line });
    }
  });

  return { code, lines, strings, calls, jsxElements, imports, ctx };
}

function parseJsxAttrs(raw = '') {
  const attrs = {};
  const attrRe = /([\w-]+)(?:=\{([^}]*)\}|="([^"]*)"|='([^']*)')?/g;
  let m;
  while ((m = attrRe.exec(raw)) !== null) {
    attrs[m[1]] = m[2] ?? m[3] ?? m[4] ?? true;
  }
  return attrs;
}

export function lineOf(code, index) {
  return code.slice(0, index).split('\n').length;
}
