/**
 * Builds a CSV document for spreadsheet export. Cells are quoted when
 * needed, and any cell a spreadsheet would evaluate as a formula (starting
 * with =, +, -, @, tab or CR) is prefixed with a quote so exported data
 * can't run as a formula when opened (CSV injection).
 */
export function toCsv(header: string[], rows: (string | number | bigint | null)[][]): string {
  return [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

function escapeCell(value: string | number | bigint | null): string {
  let text = value === null ? '' : String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
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
