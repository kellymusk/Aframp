import html2canvas from 'html2canvas'

const RGB_OVERRIDES = `
:root {
  --background: #ffffff;
  --foreground: #111827;
  --card: #ffffff;
  --card-foreground: #111827;
  --popover: #ffffff;
  --popover-foreground: #111827;
  --primary: #10b981;
  --primary-foreground: #ffffff;
  --secondary: #f3f4f6;
  --secondary-foreground: #111827;
  --muted: #f3f4f6;
  --muted-foreground: #6b7280;
  --accent: #fde68a;
  --accent-foreground: #111827;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #e5e7eb;
  --input: #e5e7eb;
  --ring: #10b981;
  --success: #10b981;
  --warning: #f59e0b;
}
.dark {
  --background: #111827;
  --foreground: #f9fafb;
  --card: #111827;
  --card-foreground: #f9fafb;
  --popover: #111827;
  --popover-foreground: #f9fafb;
  --primary: #10b981;
  --primary-foreground: #ffffff;
  --secondary: #1f2937;
  --secondary-foreground: #f9fafb;
  --muted: #1f2937;
  --muted-foreground: #9ca3af;
  --accent: #fde68a;
  --accent-foreground: #111827;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #374151;
  --input: #374151;
  --ring: #10b981;
  --success: #10b981;
  --warning: #f59e0b;
}
`

export async function exportReceiptPNG(elementId: string, filename: string) {
  const element = document.getElementById(elementId)
  if (!element) return false

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    onclone: (doc: Document) => {
      const style = doc.createElement('style')
      style.textContent = RGB_OVERRIDES
      doc.head.appendChild(style)

      doc.querySelectorAll("style,link[rel='stylesheet']").forEach((node: Element) => {
        const text = node.textContent || ''
        const href = node.getAttribute?.('href') || ''
        if (/oklab|oklch|lab\(/i.test(text) || /globals\.css|app\/globals/i.test(href)) {
          node.parentNode?.removeChild(node)
        }
      })
    },
  })
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = filename
  link.click()
  return true
}

export function exportReceiptCSV(filename: string, rows: Array<[string, string]>) {
  const csvContent = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}
