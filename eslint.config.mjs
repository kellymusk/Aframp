import nextPlugin from 'eslint-config-next'
import tseslint from 'typescript-eslint'

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'build/**', '*.d.ts'],
  },
  ...nextPlugin,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': ['warn', { ignoreRestArgs: true }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      'require-await': 'error',
      'no-return-await': 'error',
    },
  },
  {
    files: ['*.config.js', '*.config.ts', 'jest.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]

export default config
