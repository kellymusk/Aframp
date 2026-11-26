/**
 * Builds a CSV document for spreadsheet export. Cells are quoted when
 * needed, and any cell a spreadsheet would evaluate as a formula (starting
 * with =, +, -, @, or leading whitespace/line breaks before them) is prefixed
 * with a quote so exported data can't run as a formula when opened (CSV
 * injection). This is the single CSV escaping/injection defense implementation.
 */
export function toCsv(header: string[], rows: (string | number | bigint | null)[][]): string {
  return [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

function escapeCell(value: string | number | bigint | null): string {
  let text = value === null ? '' : String(value)
  // Whitespace before the formula is kept, quoted so a spreadsheet doesn't trim it.
  const hiddenFormula = typeof value === 'string' && /^[\t\r\n ]+[=+\-@]/.test(text)
  if (typeof value === 'string' && /^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`
  return hiddenFormula || /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Starts a browser download of `content` as a CSV file. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
