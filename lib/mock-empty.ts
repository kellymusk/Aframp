/** Dev/demo helper: empty lists when ?empty=1 or NEXT_PUBLIC_MOCK_EMPTY=true */
export function isMockEmptyEnabled(): boolean {
  if (typeof window !== 'undefined') {
    try {
      if (new URLSearchParams(window.location.search).get('empty') === '1') {
        return true
      }
    } catch {
      // ignore
    }
  }
  return process.env.NEXT_PUBLIC_MOCK_EMPTY === 'true'
}
