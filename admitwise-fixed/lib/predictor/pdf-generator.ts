import { jsPDF, GState } from "jspdf"
import autoTable from "jspdf-autotable"
import type { PredictionResult, StudentInput } from "./types"

function getChanceColor(chance: string): [number, number, number] {
  if (chance === "Very High" || chance === "High") return [34, 197, 94] // Green
  if (chance === "Moderate") return [245, 158, 11] // Orange
  return [239, 68, 68] // Red
}

function getSafeTargetDream(margin: number): { text: string; color: [number, number, number] } {
  if (margin > 0.5) return { text: "Safe", color: [34, 197, 94] }
  if (margin >= -1 && margin <= 0.5) return { text: "Target", color: [245, 158, 11] }
  return { text: "Dream", color: [239, 68, 68] }
}

export async function generatePredictionPDF(
  results: PredictionResult[],
  input: StudentInput,
  userName?: string | null
) {
  // 1. Fetch Logo and convert to base64 Data URL
  let logoDataUrl: string | null = null;
  try {
    const response = await fetch('/images/logo.png');
    if (response.ok) {
      const blob = await response.blob();
      logoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn("Failed to load logo for PDF", err);
  }

  // 2. Initialize PDF
  const doc = new jsPDF()
  const generatedOn = new Date().toLocaleString()
  const reportId = 'REP-' + Math.random().toString(36).substr(2, 9).toUpperCase()
  const isAllIndia = input.predictionType === "all-india"
  
  const title = isAllIndia ? "All India Seat Prediction Report" : "MHT CET College Prediction Report"
  
  let percentileDisplay = input.percentile.toFixed(4)
  let examDisplay = isAllIndia ? input.exam : input.exam || "MHT CET PCM"

  if (isAllIndia && input.examsList && input.examsList.length > 0) {
    examDisplay = input.examsList.map(e => e.exam).join(" & ")
    percentileDisplay = input.examsList.map(e => Number(e.percentile).toFixed(4)).join(" & ")
  }

  // Constants
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  // Helper: Draw Watermark
  const drawWatermark = (pdfDoc: jsPDF) => {
    pdfDoc.saveGraphicsState()
    pdfDoc.setGState(new GState({ opacity: 0.04 }))
    pdfDoc.setTextColor(100, 100, 100)
    pdfDoc.setFontSize(60)
    pdfDoc.setFont("helvetica", "bold")
    // Rotate watermark diagonally
    pdfDoc.text("ADMITWISE", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45
    })
    pdfDoc.restoreGraphicsState()
  }

  // --- COVER PAGE ---
  drawWatermark(doc)
  
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', pageWidth / 2 - 25, 40, 50, 50, '', 'FAST')
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text("AI Powered College Prediction Report", pageWidth / 2, 110, { align: "center" })

  doc.setFontSize(14)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text(title, pageWidth / 2, 120, { align: "center" })

  // Student Details Box on Cover
  doc.setDrawColor(226, 232, 240) // slate-200
  doc.setFillColor(248, 250, 252) // slate-50
  doc.roundedRect(pageWidth / 2 - 70, 135, 140, 60, 3, 3, "FD")

  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(71, 85, 105) // slate-600
  let y = 145
  if (userName) {
    doc.text(`Student Name:`, pageWidth / 2 - 60, y)
    doc.setFont("helvetica", "normal")
    doc.text(userName, pageWidth / 2 + 10, y)
    y += 8
  }
  
  doc.setFont("helvetica", "bold")
  doc.text(`Exam:`, pageWidth / 2 - 60, y)
  doc.setFont("helvetica", "normal")
  doc.text(examDisplay, pageWidth / 2 + 10, y)
  y += 8

  doc.setFont("helvetica", "bold")
  doc.text(`Percentile / Score:`, pageWidth / 2 - 60, y)
  doc.setFont("helvetica", "normal")
  doc.text(`${percentileDisplay}`, pageWidth / 2 + 10, y)
  y += 8

  doc.setFont("helvetica", "bold")
  doc.text(`CAP Round:`, pageWidth / 2 - 60, y)
  doc.setFont("helvetica", "normal")
  doc.text(input.stage, pageWidth / 2 + 10, y)
  y += 8

  doc.setFont("helvetica", "bold")
  doc.text(`Generated On:`, pageWidth / 2 - 60, y)
  doc.setFont("helvetica", "normal")
  doc.text(generatedOn, pageWidth / 2 + 10, y)

  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text(
    "This report has been generated using historical admission cutoff data and AI-assisted analysis.\nIt is intended to help students shortlist colleges based on previous admission trends.",
    pageWidth / 2,
    220,
    { align: "center" }
  )

  // --- SECOND PAGE: SUMMARY & TABLE ---
  doc.addPage()

  // Calculate Safe/Target/Dream stats
  let safeCount = 0
  let targetCount = 0
  let dreamCount = 0
  results.forEach(r => {
    const std = getSafeTargetDream(typeof r.margin === "number" ? r.margin : 0)
    if (std.text === "Safe") safeCount++
    if (std.text === "Target") targetCount++
    if (std.text === "Dream") dreamCount++
  })

  autoTable(doc, {
    startY: 25,
    theme: 'plain',
    head: [['Prediction Summary']],
    body: [
      [`Exam: ${examDisplay} | Score: ${percentileDisplay} | Category: ${input.category}`],
      [`Gender: ${input.gender} | Home University: ${input.homeUniversity}`],
      [`Total Predictions: ${results.length} Colleges`],
      [`Safe: ${safeCount} | Target: ${targetCount} | Dream: ${dreamCount}`]
    ],
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 12
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [71, 85, 105]
    },
    styles: {
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: 0.1
    }
  })

  // Prediction Table
  const tableData = results.map((r, index) => {
    const margin = typeof r.margin === "number" ? r.margin : 0
    const closingPercentile = typeof r.closingPercentile === "number" ? r.closingPercentile : 0
    const closingAllIndiaMerit = typeof r.closingAllIndiaMerit === "number" ? r.closingAllIndiaMerit : null
    const std = getSafeTargetDream(margin)
    
    // For closing value: Use merit if it exists (for JEE Main mostly), otherwise percentile
    let closingValue = "N/A"
    if (closingAllIndiaMerit !== null) {
      closingValue = closingAllIndiaMerit.toString()
    } else if (closingPercentile > 0) {
      closingValue = closingPercentile.toFixed(2)
    }

      // Exam/Merit column: for All India use per-row matchedUsing (actual exam that matched), else input.exam
      const examMeritCell = isAllIndia
        ? (r.matchedUsing || input.exam || examDisplay)
        : (input.exam || "MHT CET PCM")

    return [
      (index + 1).toString(),
      r.collegeName || "N/A",
      r.branchName || "N/A",
      r.category || "N/A",
      isAllIndia ? r.admissionType || "N/A" : r.status || "N/A",
      examMeritCell,
      closingValue,
      r.chance || "N/A",
      std.text
    ]
  })

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Rank', 'College Name', 'Branch', 'Category', 'Status', 'Exam/Merit', 'Closing Pct/Merit', 'Chance', 'Type']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // blue-600
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 55 },
      2: { cellWidth: 40 },
      7: { fontStyle: 'bold' },
      8: { fontStyle: 'bold' }
    },
    willDrawCell: function (data) {
      if (data.section === 'body') {
        if (data.column.index === 7) {
          // Chance Color using the actual cell text
          const chanceValue = data.cell.raw ? String(data.cell.raw) : "N/A"
          const color = getChanceColor(chanceValue)
          doc.setTextColor(color[0], color[1], color[2])
        }
        if (data.column.index === 8) {
          // Safe/Target/Dream Color using the actual cell text
          const typeValue = data.cell.raw ? String(data.cell.raw) : "N/A"
          let color: [number, number, number] = [239, 68, 68] // Dream/Red by default
          if (typeValue === "Safe") color = [34, 197, 94]
          if (typeValue === "Target") color = [245, 158, 11]
          doc.setTextColor(color[0], color[1], color[2])
        }
      }
    },
    didDrawPage: function (data) {
      drawWatermark(doc)

      // Header
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', margin, 5, 10, 10, '', 'FAST')
      }
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(15, 23, 42)
      doc.text("AdmitWise Predictor", margin + 12, 10)
      
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 116, 139)
      doc.text(`Report ID: ${reportId} | ${generatedOn}`, margin + 12, 14)

      // Footer
      const str = `Page ${data.pageNumber}`
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(
        "Copyright © AdmitWise. Generated for educational guidance purposes only.",
        margin,
        pageHeight - 10
      )
      doc.text(str, pageWidth - margin, pageHeight - 10, { align: 'right' })
    },
    margin: { top: 20, bottom: 20, left: margin, right: margin }
  })

  // 3. Save PDF
  const safeTitle = title.replace(/\s+/g, '_')
  const fileName = `AdmitWise_${safeTitle}_${percentileDisplay}_${input.stage}.pdf`
  doc.save(fileName)
}
