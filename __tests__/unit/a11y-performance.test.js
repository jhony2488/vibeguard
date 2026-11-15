// features/a11y-performance.feature — a11y + perf checks across layers 1–3
import { describe, test, expect } from '@jest/globals';
import { checkA11y } from '../../src/a11y.js';
import { checkPerformance } from '../../src/performance.js';
import { estimateDependencyWeight } from '../../src/layers/probabilistic.js';

const ctx = (file) => ({ filePath: file, language: 'tsx' });

describe('deterministic accessibility checks', () => {
  // features/a11y-performance.feature — "Image without alt text"
  test('flags <img> without alt', () => {
    const findings = checkA11y(`export const H = () => <img src="/hero.png" />;`, ctx('Hero.tsx'));
    expect(findings.some((x) => x.domain === 'A11y' && /alt/i.test(x.message))).toBe(true);
  });

  // features/a11y-performance.feature — "Non-native interactive element without accessibility props"
  test('flags <div onClick> missing role and tabIndex', () => {
    const code = `export const B = () => <div onClick={go}>✕</div>;`;
    const findings = checkA11y(code, ctx('Button.tsx'));
    const f = findings.find((x) => /role|tabIndex/i.test(x.recommendation));
    expect(f).toBeDefined();
    expect(f.domain).toBe('A11y');
  });

  // features/a11y-performance.feature — "Broken heading hierarchy"
  test('flags a heading jump from h1 to h4', () => {
    const code = `export const P = () => <><h1>T</h1><h4>S</h4></>;`;
    const findings = checkA11y(code, ctx('Page.tsx'));
    expect(findings.some((x) => /heading|h1|h4/i.test(x.message))).toBe(true);
  });

  // features/a11y-performance.feature — "Static color-contrast violation"
  test('flags insufficient static color contrast', () => {
    const code = `const styles = { color: '#cccccc', background: '#dddddd' };`;
    const findings = checkA11y(code, ctx('Button.tsx'));
    expect(findings.some((x) => /contrast/i.test(x.message + x.category))).toBe(true);
  });
});

describe('deterministic performance checks', () => {
  // features/a11y-performance.feature — "Unoptimized image in an optimizing framework"
  test('recommends <Image/> for native <img> in a Next.js component', () => {
    const code = `export const Hero = () => <img src="/hero.png" />;`;
    const findings = checkPerformance(code, { ...ctx('Hero.tsx'), framework: 'next' });

    const f = findings.find((x) => x.domain === 'PERFORMANCE' && /Image/i.test(x.recommendation));
    expect(f).toBeDefined();
    expect(f.message + f.recommendation).toMatch(/lcp|largest contentful paint/i);
  });

  // features/a11y-performance.feature — "Bloated library import"
  test('flags `import * as _ from lodash` and reports bundle impact', () => {
    const code = `import * as _ from 'lodash';\nconst s = _.sortBy([3, 1, 2]);`;
    const findings = checkPerformance(code, ctx('Hero.tsx'));

    const f = findings.find((x) => /import|bundle/i.test(x.message + x.recommendation));
    expect(f).toBeDefined();
    expect(f.recommendation).toMatch(/named import|only the needed/i);
  });
});

describe('layer-2 heuristics', () => {
  // features/a11y-performance.feature — "Dependency weight estimated before install"
  test('estimates bundle impact of new dependencies before install', async () => {
    const manifest = { dependencies: { lodash: '*', express: '^4.19.0' } };
    const weights = await estimateDependencyWeight(manifest);

    const lodash = weights.find((w) => w.package === 'lodash');
    expect(lodash).toBeDefined();
    expect(lodash.estimatedKb).toBeGreaterThan(0);
  });
});
