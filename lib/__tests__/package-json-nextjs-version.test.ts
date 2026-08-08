/**
 * Validates that the Next.js dependency version in package.json is correct.
 *
 * Covers issue #290:
 *   - Next.js version must be in the 15.x range (not 16.x which previously
 *     caused unpredictable installs and compatibility issues with next-pwa)
 */

import * as fs from 'fs'
import * as path from 'path'

describe('package.json Next.js version', () => {
  const pkgPath = path.resolve(__dirname, '../../package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

  it('specifies Next.js in the 15.x range', () => {
    const nextVersion = pkg.dependencies.next
    expect(nextVersion).toBeDefined()
    // Must start with ^15 or ~15 or a pinned 15.x version
    expect(nextVersion).toMatch(/^[\^~]?15\./)
  })

  it('does not reference non-existent Next.js 16', () => {
    const nextVersion = pkg.dependencies.next
    expect(nextVersion).not.toMatch(/16\./)
  })

  it('has eslint-config-next matching the Next.js major version', () => {
    const eslintConfigNext = pkg.devDependencies['eslint-config-next']
    expect(eslintConfigNext).toBeDefined()
    expect(eslintConfigNext).toMatch(/^[\^~]?15\./)
  })
})
