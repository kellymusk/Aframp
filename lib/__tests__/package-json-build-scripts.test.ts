/**
 * Validates that build scripts do not include the --webpack flag.
 *
 * Covers issue #292:
 *   - The --webpack flag forces Webpack and disables Turbopack, slowing builds.
 *   - There is no documented reason for requiring Webpack in this project.
 */

import * as fs from 'fs'
import * as path from 'path'

describe('package.json build scripts', () => {
  const pkgPath = path.resolve(__dirname, '../../package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

  it('build script does not include --webpack flag', () => {
    expect(pkg.scripts.build).toBeDefined()
    expect(pkg.scripts.build).not.toContain('--webpack')
  })

  it('build script uses next build', () => {
    expect(pkg.scripts.build).toBe('next build')
  })

  it('dev script does not include --webpack flag', () => {
    expect(pkg.scripts.dev).toBeDefined()
    expect(pkg.scripts.dev).not.toContain('--webpack')
  })
})
