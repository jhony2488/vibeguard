import { jest } from '@jest/globals';

// Fake package-registry client — injected into checkDependencies().
// `existing` lists package names the registry should report as real.
export function createMockRegistry(existing = ['lodash', 'express']) {
  const known = new Set(existing);
  return {
    exists: jest.fn(async (name) => known.has(name)),
    metadata: jest.fn(async (name) => (known.has(name) ? { name } : null)),
  };
}
