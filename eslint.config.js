import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    files: ['__tests__/**/*.js'],
    languageOptions: { globals: { ...globals.jest } },
  },
  {
    ignores: ['node_modules/', 'coverage/', '__tests__/fixtures/'],
  },
];
