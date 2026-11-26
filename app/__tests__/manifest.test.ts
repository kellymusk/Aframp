import fs from 'node:fs'
import path from 'node:path'
import manifest from '../manifest'

describe('web app manifest', () => {
  it('describes an installable standalone app', () => {
    const result = manifest()
    expect(result).toMatchObject({ name: 'Aframp', start_url: '/', display: 'standalone' })
  })

  it('only references icons that exist in public/', () => {
    for (const icon of manifest().icons ?? []) {
      expect(fs.existsSync(path.join(process.cwd(), 'public', icon.src))).toBe(true)
    }
  })
})
