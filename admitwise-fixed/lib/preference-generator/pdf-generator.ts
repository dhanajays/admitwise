import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { PreferenceResultItem, PreferenceInput } from "./types"

export async function generatePreferencePDF(
  items: PreferenceResultItem[],
  input: PreferenceInput,
  userName?: string | null
) {
  // 1. Fetch Logo safely on server-side
  let logoDataUrl: string | null = null
  try {
    const fs = await import("fs")
    const path = await import("path")
    const logoPath = path.join(process.cwd(), "public", "images", "logo.png")
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath)
      logoDataUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`
    }
  } catch (err) {
    console.warn("Failed to load logo for PDF:", err)
  }

  // 2. Initialize PDF
  const doc = new jsPDF()
  const generatedOn = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
  const reportId = "PREF-" + Math.random().toString(36).substring(2, 9).toUpperCase()

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  // Helper: Header on first page
  doc.setFillColor(15, 23, 42) // Slate 900
  doc.rect(0, 0, pageWidth, 28, "F")

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", margin, 4, 38, 20)
    } catch {
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("AdmitWise", margin, 18)
    }
  } else {
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("AdmitWise", margin, 18)
  }

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("MHT CET CAP Preference List", pageWidth - margin, 14, { align: "right" })
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(148, 163, 184)
  doc.text(`Report ID: ${reportId}  |  ${generatedOn}`, pageWidth - margin, 21, { align: "right" })

  // Student Input Summary Box
  let y = 35
  doc.setFillColor(248, 250, 252) // Slate 50
  doc.setDrawColor(226, 232, 240) // Slate 200
  doc.roundedRect(margin, y, pageWidth - margin * 2, 32, 3, 3, "FD")

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Student Profile & Options Summary", margin + 6, y + 8)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(71, 85, 105)

  doc.text(`Student: ${userName || "Aspirant"}`, margin + 6, y + 16)
  doc.text(`MHT CET Percentile: ${input.percentile.toFixed(2)}`, margin + 6, y + 23)

  doc.text(`Target CAP Round: ${input.round}`, margin + 80, y + 16)
  doc.text(`Total Options Generated: ${items.length}`, margin + 80, y + 23)

  const cityListStr = input.preferredCities.join(", ")
  doc.text(`Preferred Cities: ${cityListStr.length > 35 ? cityListStr.substring(0, 35) + "..." : cityListStr}`, margin + 140, y + 16)

  y += 40

  // Priority Branches Box
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text("Preferred Branch Priority List", margin, y)

  y += 5
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  const branchPriorityStr = input.preferredBranches.map((b, idx) => `${idx + 1}. ${b}`).join("  |  ")
  const splitBranchText = doc.splitTextToSize(branchPriorityStr, pageWidth - margin * 2)
  doc.text(splitBranchText, margin, y)

  y += splitBranchText.length * 4 + 4

  // Table Data
  const tableHead = [["Pref #", "College Code", "College Name", "Branch Name", "City", "Cutoff %", "Stage"]]
  const tableData = items.map((item) => [
    item.priorityIndex,
    item.collegeCode,
    item.collegeName,
    item.branchName,
    item.city,
    item.closingPercentile.toFixed(2),
    item.stageTag,
  ])

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [37, 99, 235], // Blue 600
      textColor: 255,
      fontSize: 8.5,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 55 },
      3: { cellWidth: 50 },
      4: { cellWidth: 20 },
      5: { cellWidth: 16, halign: "right" },
      6: { cellWidth: 16, halign: "center" },
    },
    didParseCell: function (data) {
      if (data.section === "body" && data.column.index === 6) {
        const val = String(data.cell.raw)
        if (val === "Good") data.cell.styles.textColor = [34, 197, 94]
        else if (val === "Moderate") data.cell.styles.textColor = [245, 158, 11]
        else data.cell.styles.textColor = [99, 102, 241]
      }
    },
    margin: { top: 25, bottom: 20, left: margin, right: margin },
  })

  // Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Watermark
    doc.saveGraphicsState()
    doc.setTextColor(226, 232, 240)
    doc.setFontSize(40)
    doc.setFont("helvetica", "bold")
    doc.text("AdmitWise", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 35,
    })
    doc.restoreGraphicsState()

    // Bottom Bar
    doc.setDrawColor(226, 232, 240)
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)

    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(148, 163, 184)
    doc.text("AdmitWise AI College Admission Guidance  |  https://admitwiseedu.com", margin, pageHeight - 6)
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" })
  }

  return doc
}
