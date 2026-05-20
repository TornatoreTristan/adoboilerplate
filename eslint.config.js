import { configApp } from '@adonisjs/eslint-config'

export default [
  ...configApp(),
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['database/schema.ts', 'build/**', 'node_modules/**', 'tmp/**', '.adonisjs/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Tests can use `any` for ergonomic factory/mock setups.
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },
  {
    // Migrations, seeders and CLI commands legitimately log to stdout.
    files: ['database/**/*.ts', 'commands/**/*.ts', 'bin/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // React hook files conventionally use kebab-case (use-something.ts);
    // override the snake_case-only filename rule for the inertia frontend.
    files: ['inertia/**/*.{ts,tsx}'],
    rules: {
      // Mixed conventions on the frontend: hooks/components are kebab-case,
      // pages have a mix of kebab and snake, React Email templates are
      // pascal/kebab. Allow all three so the rule stops fighting us.
      '@unicorn/filename-case': [
        'error',
        {
          cases: {
            kebabCase: true,
            pascalCase: true,
            snakeCase: true,
          },
        },
      ],
    },
  },
]
