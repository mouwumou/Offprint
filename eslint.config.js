// @ts-check
import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import astro from 'eslint-plugin-astro'
import importPlugin from 'eslint-plugin-import'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: [
      'dist/',
      '.astro/',
      'node_modules/',
      'coverage/',
      'playwright-report/',
      'test-results/',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs['flat/recommended'],
  {
    rules: {
      // `_`-prefixed bindings mean "deliberately unused" (e.g. destructure-to-omit).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Node context: build/tool configs, e2e runner, sync CLI (runs in Node, not the browser).
    files: ['*.config.{js,mjs,ts}', 'e2e/**/*.ts', 'src/sync/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Package boundaries (ADR-006), enforced on resolved file paths.
    // src/core must stay extractable as @offprint/core; src/sync may only
    // depend on core's schema layer.
    files: ['src/**/*.{js,jsx,ts,tsx,astro}'],
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
        node: true,
      },
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/core',
              from: './src/sync',
              message: 'src/core must not import src/sync (ADR-006).',
            },
            {
              target: './src/core',
              from: './src/site',
              message: 'src/core must not import src/site (ADR-006).',
            },
            {
              target: './src/core',
              from: './src/pages',
              message: 'src/core must not import src/pages (ADR-006).',
            },
            {
              target: './src/sync',
              from: './src/core',
              except: ['./schema'],
              message: 'src/sync may only import src/core/schema (ADR-006).',
            },
            {
              target: './src/sync',
              from: './src/site',
              message: 'src/sync must not import src/site (ADR-006).',
            },
            {
              target: './src/sync',
              from: './src/pages',
              message: 'src/sync must not import src/pages (ADR-006).',
            },
          ],
        },
      ],
    },
  },
)
