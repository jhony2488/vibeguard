// features/mcp-server.feature — stdio transport: JSON-RPC over `vibeguard mcp`
import { describe, test, expect, jest } from '@jest/globals';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

jest.setTimeout(30000); // subprocess spawn + skills hashing

const CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/cli.js');

// Spawns `vibeguard mcp`, sends newline-delimited JSON-RPC, collects responses.
function mcpSession() {
  const proc = spawn('node', [CLI, 'mcp'], { stdio: ['pipe', 'pipe', 'pipe'] });
  let buf = '';
  const lines = [];
  const waiters = [];
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      const msg = JSON.parse(line);
      lines.push(msg);
      waiters.splice(0).forEach((w) => w(msg));
    }
  });
  const send = (msg) => proc.stdin.write(JSON.stringify(msg) + '\n');
  const call = (id, method, params) =>
    new Promise((resolve) => {
      waiters.push((m) => m.id === id && resolve(m));
      send({ jsonrpc: '2.0', id, method, params });
    });
  return { proc, send, call };
}

describe('vibeguard mcp — JSON-RPC over stdio', () => {
  // features/mcp-server.feature — "Server is configured through mcp.json"
  test('initialize → tools/list → skills/list → resources/read over stdio', async () => {
    const { proc, send, call } = mcpSession();
    try {
      const init = await call(1, 'initialize', { protocolVersion: '2024-11-05' });
      expect(init.result.capabilities.extensions['io.modelcontextprotocol/skills']).toEqual({
        directoryRead: true,
      });
      send({ jsonrpc: '2.0', method: 'notifications/initialized' });

      const tools = await call(2, 'tools/list');
      const names = tools.result.tools.map((t) => t.name);
      expect(names).toContain('vibeguard_audit_diff');

      const skills = await call(3, 'skills/list');
      const skillNames = skills.result.skills.map((s) => s.name);
      expect(skillNames).toEqual(
        expect.arrayContaining(['fix-vibecoding-flaws', 'secure-review-checklist']),
      );

      const read = await call(4, 'resources/read', {
        uri: 'skill://fix-vibecoding-flaws/rules/VG-SEC-001.md',
      });
      expect(read.result.contents[0].text).toContain('VG-SEC-001');

      const dir = await call(5, 'resources/directory/read', {
        uri: 'skill://fix-vibecoding-flaws/rules',
      });
      expect(dir.result.entries.length).toBeGreaterThan(0);
    } finally {
      proc.kill();
    }
  });

  test('malformed JSON gets a parse error; unknown method gets -32601', async () => {
    const { proc, call } = mcpSession();
    const parseErr = new Promise((resolve) => {
      proc.stdout.once('data', (chunk) => resolve(JSON.parse(chunk)));
    });
    proc.stdin.write('not json\n');
    expect((await parseErr).error.code).toBe(-32700);

    const bad = await call(9, 'nope/method');
    expect(bad.error.code).toBe(-32601);
    proc.kill();
  });
});
