// MCP Served Skills — SEP-2640 (docs/04-mcp-server.md).
// Loads skill directories (SKILL.md + supporting files) and exposes them
// as skill:// resources with per-file sha256 digests.

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export const SKILL_SCHEME = 'skill://';

function stripQuotes(value = '') {
  const t = value.trim();
  const q = t[0];
  return (q === '"' || q === "'") && t.endsWith(q) ? t.slice(1, -1) : t;
}

// Minimal YAML-frontmatter subset: `key: value` plus one nesting level
// (`metadata:\n  version: "1.0.0"`). Enough for SKILL.md headers — keeps the
// project zero-dependency.
export function parseFrontmatter(markdown = '') {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
  if (!m) return { frontmatter: {}, body: markdown };

  const frontmatter = {};
  let currentMap = null;
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    const nested = /^\s+([A-Za-z0-9_-]+)\s*:\s*(.+)$/.exec(raw);
    if (nested && currentMap) {
      frontmatter[currentMap][nested[1]] = stripQuotes(nested[2]);
      continue;
    }
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(raw);
    if (!kv) continue;
    if (kv[2] === '') {
      frontmatter[kv[1]] = {};
      currentMap = kv[1];
    } else {
      frontmatter[kv[1]] = stripQuotes(kv[2]);
      currentMap = null;
    }
  }
  return { frontmatter, body: markdown.slice(m[0].length) };
}

export function skillMimeType(filePath = '') {
  return filePath.endsWith('.md') ? 'text/markdown' : 'text/plain';
}

function sha256(buf) {
  return `sha256:${createHash('sha256').update(buf).digest('hex')}`;
}

// Enumerates every skill directory under skillsDir. Each entry carries the
// verbatim SKILL.md frontmatter plus a resources manifest ({uri, digest,
// size, mimeType} per file). `dir` is internal — strip before serving.
export async function loadSkills(skillsDir, io = {}) {
  const rf = io.readFile ?? readFile;
  const rd = io.readdir ?? readdir;

  const walk = async (dir) => {
    const out = [];
    for (const ent of await rd(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) out.push(...(await walk(p)));
      else if (ent.isFile()) out.push(p);
    }
    return out;
  };

  let top;
  try {
    top = await rd(skillsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const skills = [];
  for (const ent of top) {
    if (!ent.isDirectory()) continue;
    const dir = path.join(skillsDir, ent.name);
    let raw;
    try {
      raw = await rf(path.join(dir, 'SKILL.md'), 'utf8');
    } catch {
      continue; // not a skill directory
    }
    const { frontmatter } = parseFrontmatter(raw);
    const name = frontmatter.name ?? ent.name;
    const resources = [];
    for (const f of (await walk(dir)).sort()) {
      const buf = await rf(f);
      const rel = path.relative(dir, f).split(path.sep).join('/');
      resources.push({
        uri: `${SKILL_SCHEME}${name}/${rel}`,
        digest: sha256(buf),
        size: buf.length,
        mimeType: skillMimeType(f),
      });
    }
    skills.push({
      name,
      description: frontmatter.description ?? '',
      metadata: frontmatter.metadata ?? {},
      uri: `${SKILL_SCHEME}${name}/SKILL.md`,
      resources,
      dir: ent.name,
    });
  }
  return skills;
}

// Maps a skill:// URI to a safe filesystem path inside the skill directory.
// Returns null for foreign schemes, unknown skills, and traversal attempts.
export function resolveSkillUri(uri, skills, skillsDir) {
  if (typeof uri !== 'string' || !uri.startsWith(SKILL_SCHEME)) return null;
  const rest = uri.slice(SKILL_SCHEME.length).replace(/^\/+/, '');
  const sep = rest.indexOf('/');
  const name = sep === -1 ? rest : rest.slice(0, sep);
  const rel = sep === -1 ? '' : rest.slice(sep + 1);
  if (!name || rel.includes('\0')) return null;

  const skill = skills.find((s) => s.name === name);
  if (!skill) return null;

  const skillDir = path.resolve(skillsDir, skill.dir ?? skill.name);
  const filePath = path.resolve(skillDir, rel);
  if (filePath !== skillDir && !filePath.startsWith(skillDir + path.sep)) return null;
  return { skill, filePath, rel };
}

export async function readSkillResource(resolved, io = {}) {
  const rf = io.readFile ?? readFile;
  const text = await rf(resolved.filePath, 'utf8');
  return {
    uri: `${SKILL_SCHEME}${resolved.skill.name}/${resolved.rel}`,
    mimeType: skillMimeType(resolved.filePath),
    text,
  };
}

// Lists a directory's direct children — subdirectories as inode/directory.
export async function readSkillDirectory(resolved, io = {}) {
  const rd = io.readdir ?? readdir;
  const prefix = `${SKILL_SCHEME}${resolved.skill.name}/${resolved.rel ? resolved.rel + '/' : ''}`;
  const ents = await rd(resolved.filePath, { withFileTypes: true });
  return ents.map((e) => ({
    uri: `${prefix}${e.name}`,
    name: e.name,
    mimeType: e.isDirectory() ? 'inode/directory' : skillMimeType(e.name),
  }));
}
