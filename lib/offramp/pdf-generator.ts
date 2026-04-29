import jsPDF from 'jspdf'

export interface ReceiptRow {
  label: string
  value: string
}

export interface ReceiptSection {
  title: string
  rows: ReceiptRow[]
}

export interface ReceiptPdfData {
  title: string
  reference: string
  subtitle?: string
  sections: ReceiptSection[]
  totalLabel?: string
  totalValue?: string
}

export function generateReceiptPDF(data: ReceiptPdfData, filename: string) {
  const doc = new jsPDF()
  let y = 24

  doc.setFontSize(20)
  doc.text(data.title, 16, y)
  doc.setFontSize(11)
  doc.text(`Reference: ${data.reference}`, 150, y, { align: 'right' })
  y += 8

  if (data.subtitle) {
    doc.setFontSize(11)
    doc.text(data.subtitle, 16, y)
    y += 8
  }

  data.sections.forEach((section) => {
    doc.setFontSize(12)
    doc.text(section.title, 16, y)
    y += 6

    doc.setFontSize(10)
    section.rows.forEach((row) => {
      const valueLines = doc.splitTextToSize(row.value, 110)
      doc.text(row.label, 16, y)
      doc.text(valueLines, 80, y)
      y += 5 * valueLines.length
    })

    y += 6
  })

  if (data.totalLabel && data.totalValue) {
    doc.setFontSize(12)
    doc.text(data.totalLabel, 16, y)
    doc.text(data.totalValue, 80, y)
    y += 8
  }

  doc.save(filename)
  return true
}
