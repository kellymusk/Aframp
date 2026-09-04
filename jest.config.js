const path = require('path')
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: [path.resolve(__dirname, './jest.setup.ts')],
  testEnvironment: 'jest-environment-jsdom',
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  modulePathIgnorePatterns: ['<rootDir>/helpcenter/', '<rootDir>/.claude/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/jest.config.js',
  ],
  // A repo-wide global threshold can't be met while most of the codebase has
  // no tests yet — real enforcement is scripts/check-diff-coverage.js, which
  // requires 80% coverage only on files a PR actually adds or changes.
  coverageReporters: ['json-summary', 'json', 'lcov', 'text'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/helpcenter/'],
}

module.exports = async () => {
  const config = await createJestConfig(customJestConfig)()
  config.transformIgnorePatterns = [
    '/node_modules/(?!(rettime|until-async|strict-event-emitter|@mswjs|@open-draft)/)',
  ]
  return config
}
