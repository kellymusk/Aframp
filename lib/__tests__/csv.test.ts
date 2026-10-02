import { toCsv } from '@/lib/csv'

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
