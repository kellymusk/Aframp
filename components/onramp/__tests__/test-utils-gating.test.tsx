/**
 * Tests that OnrampTestUtils and ProcessingTestUtils are gated
 * behind NODE_ENV checks and not rendered in production.
 *
 * Covers issue #289:
 *   - OnrampTestUtils returns null in production
 *   - ProcessingTestUtils returns null in production
 *   - Both render normally in development/test environments
 */

import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Source-level assertions: verify the production guard exists in the source
// ---------------------------------------------------------------------------
describe('OnrampTestUtils production gating', () => {
  const sourcePath = path.resolve(__dirname, '../onramp-test-utils.tsx')
  const source = fs.readFileSync(sourcePath, 'utf-8')

  it('contains a NODE_ENV production guard', () => {
    expect(source).toContain("process.env.NODE_ENV === 'production'")
  })

  it('returns null when NODE_ENV is production', () => {
    expect(source).toMatch(/if\s*\(process\.env\.NODE_ENV\s*===\s*['"]production['"]\)\s*\{[\s\S]*?return\s+null/)
  })
})

describe('ProcessingTestUtils production gating', () => {
  const sourcePath = path.resolve(__dirname, '../processing-test-utils.tsx')
  const source = fs.readFileSync(sourcePath, 'utf-8')

  it('contains a NODE_ENV production guard', () => {
    expect(source).toContain("process.env.NODE_ENV === 'production'")
  })

  it('returns null when NODE_ENV is production', () => {
    expect(source).toMatch(/if\s*\(process\.env\.NODE_ENV\s*===\s*['"]production['"]\)\s*\{[\s\S]*?return\s+null/)
  })
})

describe('OnrampPageClient production gating', () => {
  const sourcePath = path.resolve(__dirname, '../onramp-page-client.tsx')
  const source = fs.readFileSync(sourcePath, 'utf-8')

  it('renders OnrampTestUtils only in development', () => {
    // Should have a conditional render like: {process.env.NODE_ENV === 'development' && <OnrampTestUtils />}
    expect(source).toMatch(/process\.env\.NODE_ENV\s*===\s*['"]development['"]\s*&&\s*<OnrampTestUtils/)
  })

  it('does not render OnrampTestUtils unconditionally', () => {
    // There should be no uncommented line that just renders <OnrampTestUtils /> without a guard
    const lines = source.split('\n')
    const unconditionalRenders = lines.filter(
      (line) =>
        line.includes('<OnrampTestUtils') &&
        !line.includes('NODE_ENV') &&
        !line.trim().startsWith('//')  &&
        !line.trim().startsWith('*')
    )
    expect(unconditionalRenders).toHaveLength(0)
  })
})
