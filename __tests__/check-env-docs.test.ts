/**
 * @jest-environment node
 */
import {
  parseEnvExample,
  renderTable,
  escapeCell,
  normalizeTable,
} from '../scripts/check-env-docs.js'

/** Split a markdown table row into cells on unescaped pipes. */
function cells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim())
}

describe('check-env-docs', () => {
  describe('escapeCell', () => {
    it('escapes pipes and flattens newlines', () => {
      expect(escapeCell('a | b')).toBe('a \\| b')
      expect(escapeCell('line1\nline2\r\nline3')).toBe('line1 line2 line3')
      expect(escapeCell(undefined)).toBe('')
    })
  })

  describe('renderTable', () => {
    it('keeps a @type containing a pipe in a single cell', () => {
      const vars = parseEnvExample(
        [
          '# @type string (enum: testnet | public)',
          '# @optional',
          '# @default testnet',
          '# @example testnet',
          'NEXT_PUBLIC_STELLAR_NETWORK=testnet',
        ].join('\n')
      )
      const row = renderTable(vars).split('\n')[2]

      expect(row).toContain('string (enum: testnet \\| public)')
      expect(cells(row)).toEqual([
        '`NEXT_PUBLIC_STELLAR_NETWORK`',
        'string (enum: testnet \\| public)',
        'No',
        '`testnet`',
        '`testnet`',
      ])
    })

    it('keeps @example and @default values containing a pipe in a single cell', () => {
      const vars = parseEnvExample(
        ['# @type string', '# @optional', '# @default a|b', '# @example x | y', 'SOME_VAR='].join(
          '\n'
        )
      )
      const row = renderTable(vars).split('\n')[2]

      expect(cells(row)).toHaveLength(5)
      expect(cells(row)[3]).toBe('`a\\|b`')
      expect(cells(row)[4]).toBe('`x \\| y`')
    })
  })

  describe('parseEnvExample', () => {
    it('parses CRLF files', () => {
      const vars = parseEnvExample(
        ['# @type string (URL)', '# @required', '# @example https://x.test', 'NEXT_API_URL='].join(
          '\r\n'
        )
      )
      expect(vars).toEqual([
        {
          name: 'NEXT_API_URL',
          type: 'string (URL)',
          required: true,
          default: undefined,
          example: 'https://x.test',
        },
      ])
    })
  })

  describe('normalizeTable', () => {
    it('ignores Prettier column padding and line endings but not escaped pipes', () => {
      const plain = '| A | B |\n| --- | --- |\n| `x` | a \\| b |'
      const padded = '| A   | B      |\r\n| --- | ------ |\r\n| `x` | a \\| b |'
      expect(normalizeTable(padded)).toBe(normalizeTable(plain))
      expect(normalizeTable('| A | a | b |')).not.toBe(normalizeTable('| A | a \\| b |'))
    })
  })
})
