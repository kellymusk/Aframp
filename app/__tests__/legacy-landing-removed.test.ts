import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const SOURCE_DIRS = ['app', 'components', 'hooks', 'lib']
const SOURCE_FILE = /\.(ts|tsx|js|jsx|mjs)$/

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(full)
    return SOURCE_FILE.test(entry.name) ? [full] : []
  })
}

describe('legacy landing components', () => {
  it('stays removed: the directory is gone', () => {
    expect(fs.existsSync(path.join(root, 'components', 'landing'))).toBe(false)
  })

  it('is not imported by any source file (landing-light is the live landing page)', () => {
    const legacyImport = /['"](?:@\/|(?:\.\.?\/)+)(?:components\/)?landing\//
    const offenders = SOURCE_DIRS.flatMap((dir) => sourceFiles(path.join(root, dir))).filter(
      (file) =>
        !file.endsWith('legacy-landing-removed.test.ts') &&
        legacyImport.test(fs.readFileSync(file, 'utf8'))
    )

    expect(offenders.map((file) => path.relative(root, file))).toEqual([])
  })
})
