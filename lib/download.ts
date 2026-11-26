/** How long to keep a blob URL alive after click(); lets slower browsers start the download. */
export const REVOKE_DELAY_MS = 1000

let sharedLink: HTMLAnchorElement | null = null

/**
 * Trigger a browser download for a Blob. The object URL is revoked only after
 * REVOKE_DELAY_MS, because older Safari/Firefox abort the download if the URL
 * is revoked synchronously after click().
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  // Reuse a single hidden anchor across downloads.
  const link = sharedLink ?? (sharedLink = document.createElement('a'))
  link.style.display = 'none'
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename)
}
