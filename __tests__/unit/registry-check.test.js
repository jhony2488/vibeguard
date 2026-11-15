// features/deterministic-scan.feature — "Detect a hallucinated dependency in the manifest"
import { describe, test, expect } from '@jest/globals';
import { checkDependencies } from '../../src/layers/deterministic.js';
import { createMockRegistry } from '../helpers/mockRegistry.js';

const manifest = {
  name: 'vulnerable-project',
  dependencies: {
    express: '^4.19.0',
    'express-rate-limitter-ultra': '^1.0.0',
    lodash: '*',
  },
};

describe('package-registry existence checks', () => {
  test('flags a dependency missing from the registry as High "Hallucinated package"', async () => {
    const registry = createMockRegistry(['express', 'lodash']);
    const findings = await checkDependencies(manifest, { registryClient: registry });

    const f = findings.find((x) => x.message.includes('express-rate-limitter-ultra'));
    expect(f).toBeDefined();
    expect(f.category).toBe('Hallucinated package');
    expect(f.severity).toBe('High');
    expect(f.message + f.recommendation).toMatch(/typosquat|dependency confusion/i);
  });

  test('queries the registry for every declared dependency', async () => {
    const registry = createMockRegistry(['express', 'lodash']);
    await checkDependencies(manifest, { registryClient: registry });

    expect(registry.exists).toHaveBeenCalledWith('express');
    expect(registry.exists).toHaveBeenCalledWith('express-rate-limitter-ultra');
    expect(registry.exists).toHaveBeenCalledWith('lodash');
  });

  // features/deterministic-scan.feature — "Existing dependencies pass the registry check"
  test('reports no findings when every dependency exists', async () => {
    const registry = createMockRegistry(['express', 'lodash', 'express-rate-limitter-ultra']);
    const findings = await checkDependencies(manifest, { registryClient: registry });

    expect(findings.filter((x) => x.category === 'Hallucinated package')).toHaveLength(0);
  });

  test('surfaces registry lookup errors as findings instead of throwing', async () => {
    const registry = {
      exists: async () => {
        throw new Error('registry unreachable');
      },
    };
    const findings = await checkDependencies(manifest, { registryClient: registry });

    expect(findings.length).toBeGreaterThan(0);
  });
});
