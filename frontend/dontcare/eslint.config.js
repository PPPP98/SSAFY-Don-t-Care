import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import query from '@tanstack/eslint-plugin-query';
import globals from 'globals';

export default [
  // Ignore dist folder and other build outputs
  { ignores: ['dist/**', 'node_modules/**', '*.config.*', '.prettierrc.cjs'] },
  // TanStack Query ESLint plugin configuration for JS/JSX
  {
    files: ['**/*.{js,cjs,mjs,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      '@tanstack/query': query,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...query.configs.recommended.rules,
    },
    settings: { react: { version: 'detect' } },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react: react,
      'react-hooks': reactHooks,
      '@tanstack/query': query,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off', // TypeScript handles type checking
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...query.configs.recommended.rules,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
