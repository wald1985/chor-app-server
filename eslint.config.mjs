// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const moduleBoundaries = [
  {
    name: 'identity',
    patterns: [
      '**/identity/domain',
      '**/identity/domain/**',
      '**/identity/application',
      '**/identity/application/**',
      '**/identity/infrastructure',
      '**/identity/infrastructure/**',
    ],
    errorMessage:
      'Do not reach into identity internals directly. Import from identity root/barrel.',
  },
  {
    name: 'notifications',
    patterns: [
      '**/notifications/domain',
      '**/notifications/domain/**',
      '**/notifications/application',
      '**/notifications/application/**',
      '**/notifications/infrastructure',
      '**/notifications/infrastructure/**',
    ],
    errorMessage:
      'Do not reach into notifications internals directly. Import from notifications root/barrel.',
  },
];

const getForbiddenPatternsFor = (excludeModuleName) =>
  moduleBoundaries
    .filter((m) => m.name !== excludeModuleName)
    .map((m) => ({
      group: m.patterns,
      message: m.errorMessage,
    }));

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-lines-per-function': [
        'error',
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['error', 5],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    files: ['**/*.use-case.ts', '**/*.repository.ts'],
    rules: {
      'max-params': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: moduleBoundaries.map((m) => `src/${m.name}/**`),
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: getForbiddenPatternsFor(null),
        },
      ],
    },
  },
  ...moduleBoundaries.map((b) => ({
    files: [`src/${b.name}/**/*.ts`],
    ignores: [`src/${b.name}/domain/**`, `src/${b.name}/interface/**`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: getForbiddenPatternsFor(b.name),
        },
      ],
    },
  })),
  {
    files: ['src/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs', '@nestjs/*', '@prisma', '@prisma/*'],
              message: 'Domain layer must not depend on NestJS or Prisma.',
            },
            ...moduleBoundaries.map((m) => ({
              group: m.patterns,
              message: m.errorMessage,
            })),
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/interface/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@prisma', '@prisma/*'],
              message: 'Interface layer must not depend on Prisma.',
            },
            ...moduleBoundaries.map((m) => ({
              group: m.patterns,
              message: m.errorMessage,
            })),
          ],
        },
      ],
    },
  },
);

