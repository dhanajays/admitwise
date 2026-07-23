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
  doc.roundedRect(margin, y, pageWidth - margin * 2, 34, 3, 3, "FD")

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Student Profile & Options Summary", margin + 6, y + 7)

  doc.setFontSize(8.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(71, 85, 105)

  doc.text(`Student: ${userName || "Aspirant"}`, margin + 6, y + 15)
  doc.text(`Percentile: ${input.percentile.toFixed(2)} %ile`, margin + 6, y + 22)
  doc.text(`Category: ${input.category || "OPEN"}  |  Gender: ${input.gender || "Male"}  |  PwD: ${input.pwd || "No"}`, margin + 6, y + 29)

  doc.text(`Target CAP Round: ${input.round}`, margin + 95, y + 15)
  doc.text(`Total Options Generated: ${items.length}`, margin + 95, y + 22)

  const cityListStr = input.preferredCities.join(", ")
  doc.text(`Cities: ${cityListStr.length > 30 ? cityListStr.substring(0, 30) + "..." : cityListStr}`, margin + 95, y + 29)

  y += 42

  // Priority Branches Box
  doc.setFontSize(9.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text("Preferred Branch Priority List", margin, y)

  y += 4
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  const branchPriorityStr = input.preferredBranches.map((b, idx) => `${idx + 1}. ${b}`).join("  |  ")
  const splitBranchText = doc.splitTextToSize(branchPriorityStr, pageWidth - margin * 2)
  doc.text(splitBranchText, margin, y)

  y += splitBranchText.length * 3.5 + 4

  // Table Data with Dual Engine Columns: Open Cutoff, Your Cutoff, Chance
  const tableHead = [["Pref #", "College Name", "Branch Name", "City", "Open %", "Your Cutoff", "Chance"]]
  const tableData = items.map((item) => [
    item.priorityIndex,
    `${item.collegeCode} - ${item.collegeName}`,
    item.branchName,
    item.city,
    `${(item.openClosingPercentile ?? item.closingPercentile).toFixed(2)}%`,
    `${(item.categoryClosingPercentile ?? item.closingPercentile).toFixed(2)}%\n(${item.categoryUsed || "Open"})`,
    item.chanceLabel || item.chance || "GOOD MATCH",
  ])

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [37, 99, 235], // Blue 600
      textColor: 255,
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 58 },
      2: { cellWidth: 42 },
      3: { cellWidth: 18 },
      4: { cellWidth: 16, halign: "right" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 14, halign: "center" },
    },
    didParseCell: function (data) {
      if (data.section === "body" && data.column.index === 6) {
        const val = String(data.cell.raw).toUpperCase()
        if (val.includes("VERY SAFE") || val.includes("SAFE")) data.cell.styles.textColor = [16, 185, 129]
        else if (val.includes("GOOD MATCH")) data.cell.styles.textColor = [37, 99, 235]
        else if (val.includes("BORDERLINE")) data.cell.styles.textColor = [217, 119, 6]
        else data.cell.styles.textColor = [225, 29, 72]
      }
    },
    margin: { top: 25, bottom: 20, left: margin, right: margin },
  })

  // Footer & Light Logo Watermark on all pages
  const totalPages = (doc as any).internal.getNumberOfPages()
  const wmWidth = pageWidth * 0.40 // 40% of page width
  const wmHeight = wmWidth * (20 / 38)
  const wmX = (pageWidth - wmWidth) / 2
  const wmY = (pageHeight - wmHeight) / 2

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Professional Watermark: AdmitWise Logo only, centered, 5% opacity
    if (logoDataUrl) {
      try {
        doc.saveGraphicsState()
        if ((doc as any).GState) {
          doc.setGState(new (doc as any).GState({ opacity: 0.05 }))
        }
        doc.addImage(logoDataUrl, "PNG", wmX, wmY, wmWidth, wmHeight)
        doc.restoreGraphicsState()
      } catch (err) {
        console.warn("Error rendering PDF watermark logo:", err)
      }
    }

    // Bottom Footer Line & Branding
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
