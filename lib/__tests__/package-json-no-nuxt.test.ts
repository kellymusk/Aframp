/**
 * Validates that @nuxt/kit is not listed as a dependency.
 *
 * Covers issue #291:
 *   - @nuxt/kit is a Nuxt.js build tool and has no place in a Next.js project.
 *   - Its presence adds unnecessary bundle weight and could cause version conflicts.
 */

import * as fs from 'fs'
import * as path from 'path'

describe('package.json Nuxt dependency check', () => {
  const pkgPath = path.resolve(__dirname, '../../package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

  it('does not include @nuxt/kit in dependencies', () => {
    expect(pkg.dependencies).not.toHaveProperty('@nuxt/kit')
  })

  it('does not include any @nuxt packages in dependencies', () => {
    const nuxtDeps = Object.keys(pkg.dependencies || {}).filter((dep) =>
      dep.startsWith('@nuxt/')
    )
    expect(nuxtDeps).toEqual([])
  })

  it('does not include any @nuxt packages in devDependencies', () => {
    const nuxtDevDeps = Object.keys(pkg.devDependencies || {}).filter((dep) =>
      dep.startsWith('@nuxt/')
    )
    expect(nuxtDevDeps).toEqual([])
  })
})
