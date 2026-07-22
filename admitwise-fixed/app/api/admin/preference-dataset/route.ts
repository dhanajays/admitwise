import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import Papa from "papaparse"
import fs from "fs"
import path from "path"
import os from "os"

export const maxDuration = 300 // 5 minutes timeout for large datasets
export const dynamic = "force-dynamic"

const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024 // 30 MB = 31,457,280 bytes

const REQUIRED_COLUMNS = [
  "college_code",
  "college_name",
  "branch_code",
  "branch_name",
  "status",
  "home_university",
  "seat_section",
  "stage",
  "category_code",
  "gender",
  "disability",
  "defense_q",
  "closing_rank",
  "closing_percentile",
  "city",
]

interface ParsedMultipart {
  round: string
  fileName: string
  fileSize: number
  fileContent: string
}

async function parseMultipartForm(req: Request): Promise<ParsedMultipart> {
  const contentType = req.headers.get("content-type") || ""

  // 1. Try standard req.formData() first
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const round = ((formData.get("round") as string) || "Round 1").trim()

    if (file) {
      const fileContent = await file.text()
      return {
        round,
        fileName: file.name || "uploaded.csv",
        fileSize: file.size,
        fileContent,
      }
    }
  } catch (err: any) {
    console.log("ℹ️ [Preference Dataset Upload] req.formData() size limit hit or parse error:", err?.message || err)
  }

  // 2. Fallback: Parse raw buffer directly from req.arrayBuffer()
  const arrayBuf = await req.arrayBuffer()
  const buffer = Buffer.from(arrayBuf)

  const match = contentType.match(/boundary=([^;]+)/i)
  if (!match) {
    throw new Error("Invalid multipart Content-Type header (boundary missing)")
  }

  const rawBoundary = match[1].replace(/^["']|["']$/g, "").trim()
  const boundary = `--${rawBoundary}`
  const textContent = buffer.toString("utf-8")
  const parts = textContent.split(boundary)

  let round = "Round 1"
  let fileName = "uploaded.csv"
  let fileContent = ""
  let fileSize = 0

  for (const part of parts) {
    if (!part || part === "--\r\n" || part === "--") continue

    const headerEndIndex = part.indexOf("\r\n\r\n")
    if (headerEndIndex === -1) continue

    const headers = part.substring(0, headerEndIndex)
    let body = part.substring(headerEndIndex + 4)

    if (body.endsWith("\r\n")) {
      body = body.substring(0, body.length - 2)
    }

    if (headers.includes('name="round"')) {
      round = body.trim() || "Round 1"
    } else if (headers.includes('name="file"')) {
      const nameMatch = headers.match(/filename=["']?([^"'\r\n]+)["']?/i)
      if (nameMatch) {
        fileName = nameMatch[1]
      }
      fileContent = body
      fileSize = Buffer.byteLength(body, "utf-8")
    }
  }

  return {
    round,
    fileName,
    fileSize,
    fileContent,
  }
}

async function checkAdminRole() {
  try {
    const adminSession = await getAdminSession()
    if (!adminSession || !["Super Admin", "Manager"].includes(adminSession.role)) {
      return null
    }
    return adminSession
  } catch (err) {
    console.error("[Preference Dataset Route] Admin session check failed:", err)
    return null
  }
}

export async function GET(req: Request) {
  try {
    const adminSession = await checkAdminRole()
    if (!adminSession) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 })
    }

    const datasets = await db.preferenceGeneratorDataset.findMany({
      orderBy: [{ round: "asc" }, { version: "desc" }],
      include: {
        uploadedByUser: {
          select: { name: true, email: true },
        },
        versions: {
          orderBy: { version: "desc" },
        },
      },
    })

    return NextResponse.json({ success: true, datasets })
  } catch (error: any) {
    console.error("❌ [Preference Dataset GET Error]:", error?.stack || error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const startTime = Date.now()
  console.log("\n=======================================================")
  console.log("🚀 [Preference Dataset Upload] Upload Started")

  let tmpFilePath: string | null = null

  try {
    const adminSession = await checkAdminRole()
    if (!adminSession) {
      console.warn("⚠️ [Preference Dataset Upload] Unauthorized attempt")
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 })
    }

    const contentType = req.headers.get("content-type") || ""
    const contentLengthStr = req.headers.get("content-length") || "0"
    const requestSizeBytes = parseInt(contentLengthStr, 10)

    // Parse multipart upload
    const { round, fileName, fileSize, fileContent } = await parseMultipartForm(req)
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2)

    console.log(`File Name: ${fileName}`)
    console.log(`File Size: ${fileSize} bytes (${fileSizeMB} MB)`)
    console.log(`Content Type: ${contentType}`)
    console.log(`Request Size: ${requestSizeBytes} bytes`)

    if (!fileContent || fileContent.trim().length === 0) {
      return NextResponse.json({ success: false, error: "CSV file is empty" }, { status: 400 })
    }

    // Verify exact byte size limit (30 MB = 31,457,280 bytes)
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      console.warn(`⚠️ [Preference Dataset Upload] File size ${fileSizeMB} MB exceeds 30 MB limit`)
      return NextResponse.json(
        {
          success: false,
          error: `CSV exceeds 30 MB limit (${fileSizeMB} MB).`,
        },
        { status: 400 }
      )
    }

    // Save temporary file to disk (os.tmpdir()) for disk-based parsing
    const tmpFileName = `pref_ds_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.csv`
    tmpFilePath = path.join(os.tmpdir(), tmpFileName)
    fs.writeFileSync(tmpFilePath, fileContent, "utf-8")
    console.log(`[Preference Dataset Upload] Saved temp file: ${tmpFilePath}`)

    // Step 1: Validate Header Columns
    const firstLine = fileContent.split(/\r?\n/)[0] || ""
    const headerCols = firstLine
      .split(",")
      .map((c) => c.trim().replace(/^["']|["']$/g, "").toLowerCase())

    console.log("[Preference Dataset Upload] Extracted CSV Headers:", headerCols)

    for (const requiredCol of REQUIRED_COLUMNS) {
      const hasCol = headerCols.some((h) => {
        const normH = h.replace(/[^a-z0-9]/g, "")
        const normReq = requiredCol.replace(/[^a-z0-9]/g, "")
        return normH === normReq || h === requiredCol
      })

      if (!hasCol) {
        console.warn(`⚠️ [Preference Dataset Upload] Missing required column: ${requiredCol}`)
        if (tmpFilePath && fs.existsSync(tmpFilePath)) {
          try {
            fs.unlinkSync(tmpFilePath)
          } catch (e) {}
        }
        return NextResponse.json(
          {
            success: false,
            error: `Missing required column: ${requiredCol}`,
          },
          { status: 400 }
        )
      }
    }

    console.log("✅ [Preference Dataset Upload] Validation: Header check passed")
    console.log("⚙️ [Preference Dataset Upload] Parser Started")

    // Parse CSV from temporary file disk stream
    const fileStream = fs.createReadStream(tmpFilePath, { encoding: "utf-8" })
    const parsedData: any[] = await new Promise((resolve, reject) => {
      Papa.parse(fileStream, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase(),
        complete: (results) => resolve(results.data),
        error: (err) => reject(err),
      })
    })

    const rowsParsed = parsedData.length
    console.log(`[Preference Dataset Upload] Rows Parsed: ${rowsParsed}`)

    if (rowsParsed === 0) {
      if (tmpFilePath && fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath)
      return NextResponse.json({ success: false, error: "No data rows found in CSV" }, { status: 400 })
    }

    const roundNumber = parseInt(round.replace(/\D/g, ""), 10) || 1

    // Step: Archive existing active dataset for this round
    const existingActive = await db.preferenceGeneratorDataset.findFirst({
      where: { round, status: "Active" },
    })

    const newVersion = existingActive ? existingActive.version + 1 : 1

    if (existingActive) {
      console.log(`[Preference Dataset Upload] Deactivating existing dataset ID ${existingActive.id} (v${existingActive.version})`)
      await db.preferenceGeneratorDataset.update({
        where: { id: existingActive.id },
        data: { status: "Inactive" },
      })
    }

    // Step: Create new active dataset record
    const dataset = await db.preferenceGeneratorDataset.create({
      data: {
        exam: "MHT CET PCM",
        round,
        uploadedByUserId: adminSession.userId,
        status: "Active",
        rowCount: rowsParsed,
        version: newVersion,
      },
    })

    // Create dataset version record
    await db.preferenceDatasetVersion.create({
      data: {
        datasetId: dataset.id,
        version: newVersion,
        rowCount: rowsParsed,
        uploadedByUserId: adminSession.userId,
      },
    })

    // Map CSV rows into database cutoffs
    const cutoffRows: any[] = []
    for (let idx = 0; idx < parsedData.length; idx++) {
      const row = parsedData[idx]
      const collegeCode = String(row.college_code || row.collegecode || "").trim()
      const collegeName = String(row.college_name || row.collegename || "").trim()
      const branchCode = String(row.branch_code || row.branchcode || "").trim()
      const branchName = String(row.branch_name || row.branchname || "").trim()
      const status = String(row.status || "").trim()
      const homeUniversity = String(row.home_university || row.homeuniversity || "").trim()
      const seatSection = String(row.seat_section || row.seatsection || "").trim()
      const stage = String(row.stage || "").trim()
      const categoryCodeRaw = String(row.category_code || row.categorycode || row.category || "").trim()
      const gender = String(row.gender || "").trim()
      const disability = String(row.disability || "No").trim()
      const defenseQuota = String(row.defense_q || row.defenseq || row.defense_quota || "No").trim()
      const closingRank = parseInt(row.closing_rank || row.closingrank || "0", 10)
      const closingPercentile = parseFloat(row.closing_percentile || row.closingpercentile || "0")
      const city = String(row.city || "").trim()

      if (!collegeName || !branchName || isNaN(closingPercentile)) {
        continue
      }

      cutoffRows.push({
        datasetId: dataset.id,
        round,
        collegeCode,
        collegeName,
        branchCode,
        branchName,
        status,
        homeUniversity,
        seatSection,
        stage,
        categoryCodeRaw,
        gender,
        disability,
        defenseQuota,
        closingRank: isNaN(closingRank) ? 0 : closingRank,
        closingPercentile,
        city,
      })
    }

    // Batch insert cutoffs in chunks of 2,000
    const chunkSize = 2000
    let insertedCount = 0

    for (let i = 0; i < cutoffRows.length; i += chunkSize) {
      const chunk = cutoffRows.slice(i, i + chunkSize)
      await db.preferenceCutoff.createMany({
        data: chunk,
      })
      insertedCount += chunk.length
    }

    console.log(`[Preference Dataset Upload] Rows Imported: ${insertedCount}`)
    console.log(`🎉 [Preference Dataset Upload] Upload Completed in ${(Date.now() - startTime)}ms`)
    console.log("=======================================================\n")

    // Delete temp file from disk
    if (tmpFilePath && fs.existsSync(tmpFilePath)) {
      try {
        fs.unlinkSync(tmpFilePath)
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      rowsImported: insertedCount,
      round: roundNumber,
      message: `${round} dataset uploaded successfully.`,
      dataset: {
        id: dataset.id,
        round: dataset.round,
        rowCount: insertedCount,
        version: dataset.version,
        uploadedAt: dataset.uploadedAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error("❌ [Preference Dataset Upload Fatal Error]:", error?.stack || error)

    if (tmpFilePath && fs.existsSync(tmpFilePath)) {
      try {
        fs.unlinkSync(tmpFilePath)
      } catch (e) {}
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Upload failed due to a server processing error. Please try again.",
      },
      { status: 500 }
    )
  }
}


export async function DELETE(req: Request) {
  try {
    const adminSession = await checkAdminRole()
    if (!adminSession) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "Dataset ID is required" }, { status: 400 })
    }

    console.log(`[Preference Dataset Delete] Deleting dataset ID ${id}`)
    await db.preferenceGeneratorDataset.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: "Dataset version deleted successfully." })
  } catch (error: any) {
    console.error("❌ [Preference Dataset DELETE Error]:", error?.stack || error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete dataset." },
      { status: 500 }
    )
  }
}

