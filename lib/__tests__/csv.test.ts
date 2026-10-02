import { downloadCsv, toCsv } from '@/lib/csv'

describe('toCsv', () => {
  it('joins a header and rows with CRLF', () => {
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('a,b\r\n1,x')
  })

  it('quotes cells containing commas, quotes or newlines', () => {
    expect(toCsv(['memo'], [['a,b'], ['say "hi"'], ['two\nlines']])).toBe(
      'memo\r\n"a,b"\r\n"say ""hi"""\r\n"two\nlines"'
    )
  })

  it('neutralises cells a spreadsheet would run as a formula', () => {
    expect(toCsv(['memo'], [['=HYPERLINK("x")'], ['@SUM(A1)'], ['+1']])).toBe(
      `memo\r\n"'=HYPERLINK(""x"")"\r\n'@SUM(A1)\r\n'+1`
    )
  })

  it('leaves numbers (including negatives) and empty cells alone', () => {
    expect(
      toCsv(
        ['n', 'empty'],
        [
          [-5, null],
          [10n, ''],
        ]
      )
    ).toBe('n,empty\r\n-5,\r\n10,')
  })
})

describe('downloadCsv', () => {
  it('downloads the content as a named CSV file', () => {
    const createObjectURL = jest.fn(() => 'blob:csv')
    const revokeObjectURL = jest.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadCsv('payments.csv', 'a,b')

    const link = click.mock.instances[0] as unknown as HTMLAnchorElement
    expect(link.download).toBe('payments.csv')
    expect(link.href).toBe('blob:csv')
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv')
    expect(document.querySelector('a[download]')).toBeNull()
    click.mockRestore()
  })
})
