// features/mcp-server.feature — served skills (SEP-2640): skills/list, skills/get,
// resources/read, resources/directory/read, capabilities
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createMcpServer } from '../../src/mcp/server.js';
import { loadSkills, parseFrontmatter, resolveSkillUri } from '../../src/mcp/skills.js';
import { createMockLlm } from '../helpers/mockLlm.js';
import { createMockRegistry } from '../helpers/mockRegistry.js';
import { makeTmpDir, writeTmpFile, cleanup } from '../helpers/tmpProject.js';

const makeServer = (deps = {}) =>
  createMcpServer({
    llm: createMockLlm(),
    registryClient: createMockRegistry(),
    ...deps,
  });

describe('SEP-2640 — capabilities and skills/list', () => {
  // features/mcp-server.feature — "Server declares the skills extension"
  test('capabilities declare the skills extension and resources', () => {
    const server = makeServer();
    expect(server.capabilities.extensions['io.modelcontextprotocol/skills']).toEqual({
      directoryRead: true,
    });
    expect(server.capabilities.resources).toBeDefined();
  });

  test('initialize returns capabilities + serverInfo', async () => {
    const server = makeServer();
    const res = await server.handleRequest('initialize', { protocolVersion: '2025-03-26' });
    expect(res.protocolVersion).toBe('2025-03-26');
    expect(res.serverInfo.name).toBe('vibeguard');
    expect(res.capabilities.extensions['io.modelcontextprotocol/skills']).toBeDefined();
  });

  // features/mcp-server.feature — "Server enumerates served skills"
  test('skills/list enumerates both skills with frontmatter + resources manifest', async () => {
    const server = makeServer();
    const { skills } = await server.handleRequest('skills/list');

    const names = skills.map((s) => s.name);
    expect(names).toEqual(
      expect.arrayContaining(['fix-vibecoding-flaws', 'secure-review-checklist']),
    );

    const fix = skills.find((s) => s.name === 'fix-vibecoding-flaws');
    expect(fix.description).toMatch(/remediate/i);
    expect(fix.metadata.version).toBeDefined();
    expect(fix.uri).toBe('skill://fix-vibecoding-flaws/SKILL.md');
    expect(fix.resources.length).toBeGreaterThan(0);
    for (const r of fix.resources) {
      expect(r.uri).toMatch(/^skill:\/\//);
      expect(r.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(r.size).toBeGreaterThan(0);
    }
  });

  test('skills/get returns a single skill by SKILL.md uri', async () => {
    const server = makeServer();
    const { skill } = await server.handleRequest('skills/get', {
      uri: 'skill://secure-review-checklist/SKILL.md',
    });
    expect(skill.name).toBe('secure-review-checklist');
    expect(skill.resources.some((r) => r.uri.endsWith('checklists/agent-diff.md'))).toBe(true);
  });
});

describe('SEP-2640 — resources/read and directory read', () => {
  // features/mcp-server.feature — "Agent loads a remediation playbook after a finding"
  test('resources/read returns the playbook for a ruleId', async () => {
    const server = makeServer();
    const { contents } = await server.handleRequest('resources/read', {
      uri: 'skill://fix-vibecoding-flaws/rules/VG-SEC-001.md',
    });
    expect(contents).toHaveLength(1);
    expect(contents[0].mimeType).toBe('text/markdown');
    expect(contents[0].text).toContain('VG-SEC-001');
    expect(contents[0].text).toMatch(/verify/i);
  });

  // features/mcp-server.feature — "Browse a skill's supporting files"
  test('resources/directory/read lists playbook files and marks subdirs', async () => {
    const server = makeServer();
    const { entries } = await server.handleRequest('resources/directory/read', {
      uri: 'skill://fix-vibecoding-flaws/rules',
    });
    const names = entries.map((e) => e.name);
    expect(names).toContain('VG-SEC-001.md');
    expect(entries.every((e) => e.uri.startsWith('skill://fix-vibecoding-flaws/rules/'))).toBe(
      true,
    );
  });

  test('resources/read rejects traversal outside the skill dir', async () => {
    const server = makeServer();
    await expect(
      server.handleRequest('resources/read', {
        uri: 'skill://fix-vibecoding-flaws/../../package.json',
      }),
    ).rejects.toMatchObject({ code: -32602 });
  });

  test('resources/read rejects foreign schemes and unknown skills', async () => {
    const server = makeServer();
    await expect(
      server.handleRequest('resources/read', { uri: 'file:///etc/passwd' }),
    ).rejects.toMatchObject({ code: -32602 });
    await expect(
      server.handleRequest('resources/read', { uri: 'skill://no-such-skill/SKILL.md' }),
    ).rejects.toMatchObject({ code: -32602 });
  });

  test('unknown methods raise METHOD_NOT_FOUND', async () => {
    const server = makeServer();
    await expect(server.handleRequest('bogus/method')).rejects.toMatchObject({
      code: -32601,
    });
  });
});

describe('skills engine — unit surface', () => {
  test('parseFrontmatter extracts name, description and nested metadata', () => {
    const md = `---
name: demo
description: "A demo skill"
metadata:
  version: "2.1.0"
---

# Body`;
    const { frontmatter, body } = parseFrontmatter(md);
    expect(frontmatter).toEqual({
      name: 'demo',
      description: 'A demo skill',
      metadata: { version: '2.1.0' },
    });
    expect(body).toContain('# Body');
  });

  let dir;
  beforeAll(async () => {
    dir = await makeTmpDir();
    await writeTmpFile(
      dir,
      'demo-skill/SKILL.md',
      '---\nname: demo\ndescription: tmp\n---\n# demo\n',
    );
    await writeTmpFile(dir, 'demo-skill/rules/R-001.md', '# playbook\n');
    await writeTmpFile(dir, 'not-a-skill/README.md', '# no frontmatter dir\n');
  });
  afterAll(async () => cleanup(dir));

  test('loadSkills skips dirs without SKILL.md and hashes every file', async () => {
    const skills = await loadSkills(dir);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('demo');
    expect(skills[0].resources.map((r) => r.uri)).toEqual(
      expect.arrayContaining(['skill://demo/SKILL.md', 'skill://demo/rules/R-001.md']),
    );
  });

  test('resolveSkillUri guards traversal and unknown names', async () => {
    const skills = await loadSkills(dir);
    expect(resolveSkillUri('skill://demo/../secret', skills, dir)).toBeNull();
    expect(resolveSkillUri('skill://nope/x', skills, dir)).toBeNull();
    expect(resolveSkillUri('http://evil', skills, dir)).toBeNull();
    const ok = resolveSkillUri('skill://demo/rules/R-001.md', skills, dir);
    expect(ok.filePath).toContain('R-001.md');
  });
});
