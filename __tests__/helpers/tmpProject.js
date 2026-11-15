import { mkdtemp, cp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures',
);

// Creates a fresh temp directory; remember to rm it in afterEach/afterAll.
export async function makeTmpDir(prefix = 'vibeguard-test-') {
  return mkdtemp(path.join(tmpdir(), prefix));
}

// Copies a fixture project into a temp dir and returns its path.
export async function copyFixtureProject(name = 'vulnerable-project') {
  const dest = await makeTmpDir();
  await cp(path.join(FIXTURES, name), dest, { recursive: true });
  return dest;
}

export async function writeTmpFile(dir, relPath, contents) {
  const target = path.join(dir, relPath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
  return target;
}

export async function cleanup(dir) {
  await rm(dir, { recursive: true, force: true });
}
