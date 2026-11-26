import { downloadBlob, downloadCsv, REVOKE_DELAY_MS } from '../download'

describe('downloadBlob', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    URL.createObjectURL = jest.fn(() => 'blob:mock')
    URL.revokeObjectURL = jest.fn()
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('does not revoke the object URL synchronously after click', () => {
    downloadBlob(new Blob(['x']), 'a.txt')
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })

  it('revokes the object URL after the delay', () => {
    downloadBlob(new Blob(['x']), 'a.txt')
    jest.advanceTimersByTime(REVOKE_DELAY_MS - 1)
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('reuses a single anchor element across downloads', () => {
    const spy = jest.spyOn(document, 'createElement')
    downloadBlob(new Blob(['1']), 'a.txt')
    downloadBlob(new Blob(['2']), 'b.txt')
    expect(spy.mock.calls.filter(([t]) => t === 'a').length).toBeLessThanOrEqual(1)
  })

  it('downloadCsv escapes quotes', () => {
    let captured: Blob | undefined
    ;(URL.createObjectURL as jest.Mock).mockImplementation(
      (b: Blob) => ((captured = b), 'blob:mock')
    )
    downloadCsv('t.csv', [['a"b', 'c']])
    expect(captured).toBeDefined()
  })
})
