// Accessibility checks — Layer 1 deterministic rules (docs/06-a11y-performance.md).

import { buildCodeModel } from './analyzers/codeModel.js';

function a11yFinding({ ruleId, category, file, line, message, recommendation }) {
  return { ruleId, domain: 'A11y', category, severity: 'Low', file, line, message, recommendation };
}

function luminance(hex) {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hex1, hex2) {
  const [l1, l2] = [luminance(hex1), luminance(hex2)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function checkA11y(code, ctx = {}) {
  const { filePath = '<unknown>' } = ctx;
  const model = buildCodeModel(code, ctx);
  const findings = [];

  // <img> without alt
  for (const el of model.jsxElements) {
    if (el.tag === 'img' && !('alt' in el.attrs)) {
      findings.push(
        a11yFinding({
          ruleId: 'VG-A11Y-001',
          category: 'Missing alt text',
          file: filePath,
          line: el.line,
          message: '<img> is missing the mandatory alt attribute.',
          recommendation: 'Add a descriptive alt attribute (or alt="" for decorative images).',
        }),
      );
    }
  }

  // Non-native interactive element without accessibility props
  for (const el of model.jsxElements) {
    if ((el.tag === 'div' || el.tag === 'span') && 'onClick' in el.attrs && !('role' in el.attrs) && !('tabIndex' in el.attrs)) {
      findings.push(
        a11yFinding({
          ruleId: 'VG-A11Y-002',
          category: 'Inaccessible interactive element',
          file: filePath,
          line: el.line,
          message: `<${el.tag}> with onClick is not keyboard/screen-reader accessible.`,
          recommendation: 'Add role="button" and tabIndex={0}, or use a semantic <button>.',
        }),
      );
    }
  }

  // Heading hierarchy jumps (h1 → h4)
  const headings = model.jsxElements.filter((e) => /^h[1-6]$/.test(e.tag));
  for (let i = 1; i < headings.length; i++) {
    const prev = Number(headings[i - 1].tag[1]);
    const curr = Number(headings[i].tag[1]);
    if (curr > prev + 1) {
      findings.push(
        a11yFinding({
          ruleId: 'VG-A11Y-003',
          category: 'Broken heading hierarchy',
          file: filePath,
          line: headings[i].line,
          message: `Heading level jumps from h${prev} to h${curr} without intermediate levels.`,
          recommendation: `Use h${prev + 1} or restructure the outline.`,
        }),
      );
      break;
    }
  }

  // Static color-contrast violations: color/background hex pairs in the same object
  const pairRe = /color\s*:\s*['"]?(#[0-9a-fA-F]{6})['"]?[^}]*background(?:Color)?\s*:\s*['"]?(#[0-9a-fA-F]{6})['"]?|background(?:Color)?\s*:\s*['"]?(#[0-9a-fA-F]{6})['"]?[^}]*color\s*:\s*['"]?(#[0-9a-fA-F]{6})['"]?/g;
  model.lines.forEach((lineText, i) => {
    pairRe.lastIndex = 0;
    let m;
    while ((m = pairRe.exec(lineText)) !== null) {
      const [fg, bg] = m[1] ? [m[1], m[2]] : [m[4], m[3]];
      if (fg && bg && contrastRatio(fg, bg) < 4.5) {
        findings.push(
          a11yFinding({
            ruleId: 'VG-A11Y-004',
            category: 'Insufficient color contrast',
            file: filePath,
            line: i + 1,
            message: `Text color ${fg} on background ${bg} fails the WCAG AA contrast ratio (4.5:1).`,
            recommendation: 'Darken the text color or lighten the background to reach a 4.5:1 ratio.',
          }),
        );
        break;
      }
    }
  });

  return findings;
}
