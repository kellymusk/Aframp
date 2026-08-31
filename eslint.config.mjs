import nextPlugin from '@next/eslint-plugin-next'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettierConfig from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'
import storybook from 'eslint-plugin-storybook'

// `eslint-config-next`'s package only ships a legacy eslintrc-format config,
// which unconditionally loads @rushstack/eslint-patch on require and breaks
// under current ESLint — see https://github.com/microsoft/rushstack/issues.
// Going straight to the underlying plugin's own flat-config export sidesteps
// that patch entirely.
const config = [
  {
    // public/sw.js and workbox-*.js are generated PWA build output, not
    // hand-written source — coverage/ is the Jest coverage report.
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'coverage/**',
      'public/**',
      '.claude/**',
      '*.d.ts',
    ],
  },
  nextPlugin.flatConfig.coreWebVitals,
  jsxA11y.flatConfigs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
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
  {
    // CLI scripts: console output is the interface, and they run directly
    // via `node`, so CommonJS require() is the point rather than a mistake.
    files: ['scripts/**/*.js'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettierConfig,
  ...storybook.configs['flat/recommended'],
]

export default config
