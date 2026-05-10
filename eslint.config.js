import { configApp } from '@adonisjs/eslint-config'

export default [
  ...configApp(),
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
