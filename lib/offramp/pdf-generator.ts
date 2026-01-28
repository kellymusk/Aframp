import jsPDF from "jspdf"
import html2canvas from "html2canvas"

export async function generateReceiptPDF(elementId: string, filename: string) {
    const element = document.getElementById(elementId)
    if (!element) return

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
        })

        const imgData = canvas.toDataURL("image/png")
        const pdf = new jsPDF("p", "mm", "a4")
        const imgProps = pdf.getImageProperties(imgData)
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
        pdf.save(filename)
        return true
    } catch (error) {
        console.error("PDF generation failed:", error)
        return false
    }
}
