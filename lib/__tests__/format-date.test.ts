import { formatDate, formatDateTime } from '@/lib/format-date'

describe('format-date', () => {
  it('formats timestamps day-first with the year', () => {
    const value = formatDateTime('2026-10-02T09:13:00Z')
    expect(value).toMatch(/2 Oct 2026/)
  })

  it('formats dates without a time', () => {
    expect(formatDate('2026-10-02T09:13:00Z')).toMatch(/^\d{1,2} Oct 2026$/)
  })

  it('shows a dash for a missing or malformed timestamp', () => {
    expect(formatDateTime('')).toBe('—')
    expect(formatDate('not a date')).toBe('—')
  })
})
