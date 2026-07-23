import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import Papa from "papaparse"
import fs from "fs"
import path from "path"
import os from "os"
import Busboy from "busboy"
import { Readable } from "stream"

export const maxDuration = 300 // 5 minutes execution timeout for large datasets
export const dynamic = "force-dynamic"

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

interface StreamedUploadResult {
  round: string
  fileName: string
  fileSize: number
  tmpFilePath: string
}

function normalizeCapRound(input: string): string {
  const clean = input.trim().toLowerCase()
  if (clean.includes("2") || clean === "2") return "Round 2"
  if (clean.includes("3") || clean === "3") return "Round 3"
  if (clean.includes("4") || clean === "4") return "Round 4"
  return "Round 1"
}

async function streamMultipartToDisk(req: Request): Promise<StreamedUploadResult> {
  const contentType = req.headers.get("content-type") || ""

  // Fallback if not multipart
  if (!contentType.includes("multipart/form-data")) {
    throw new Error("Invalid request header: Content-Type must be multipart/form-data")
  }

  const tmpFileName = `pref_ds_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.csv`
  const tmpFilePath = path.join(os.tmpdir(), tmpFileName)
  const writeStream = fs.createWriteStream(tmpFilePath)

  let round = "Round 1"
  let fileName = "uploaded.csv"
  let fileSize = 0

  return new Promise((resolve, reject) => {
    try {
      const busboy = Busboy({
        headers: { "content-type": contentType },
      })

      busboy.on("field", (fieldname, val) => {
        if (fieldname === "round") {
          round = val ? normalizeCapRound(val) : "Round 1"
        }
      })

      busboy.on("file", (fieldname, fileStream, info) => {
        fileName = info.filename || "uploaded.csv"

        fileStream.on("data", (chunk) => {
          fileSize += chunk.length
        })

        fileStream.pipe(writeStream)
      })

      busboy.on("finish", () => {
        writeStream.end()
        resolve({
          round,
          fileName,
          fileSize,
          tmpFilePath,
        })
      })

      busboy.on("error", (err: any) => {
        writeStream.end()
        if (fs.existsSync(tmpFilePath)) {
          try { fs.unlinkSync(tmpFilePath) } catch (e) {}
        }
        reject(err)
      })

      if (!req.body) {
        reject(new Error("Request body is empty"))
        return
      }

      // Convert Web ReadableStream to Node.js Readable stream
      const nodeStream = Readable.fromWeb(req.body as any)
      nodeStream.pipe(busboy)
    } catch (err) {
      if (fs.existsSync(tmpFilePath)) {
        try { fs.unlinkSync(tmpFilePath) } catch (e) {}
      }
      reject(err)
    }
  })
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

    // Stream multipart file upload to temp disk file via Busboy
    const streamed = await streamMultipartToDisk(req)
    tmpFilePath = streamed.tmpFilePath

    const round = streamed.round
    const fileName = streamed.fileName
    const fileSize = streamed.fileSize
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2)

    console.log("📥 [Preference Dataset Upload] File Reached Backend")
    console.log(`File Name: ${fileName}`)
    console.log(`File Size: ${fileSize} bytes (${fileSizeMB} MB)`)
    console.log(`Content Type: ${contentType}`)
    console.log(`Request Size: ${requestSizeBytes} bytes`)

    if (fileSize === 0) {
      if (tmpFilePath && fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath)
      return NextResponse.json({ success: false, error: "CSV file is empty" }, { status: 400 })
    }

    // Step 1: Validate Header Columns
    console.log("[Preference Dataset Upload] Validation Started: Header check")
    const fileHeaderBuffer = Buffer.alloc(4096)
    const fd = fs.openSync(tmpFilePath, "r")
    fs.readSync(fd, fileHeaderBuffer, 0, 4096, 0)
    fs.closeSync(fd)

    const firstLine = fileHeaderBuffer.toString("utf-8").split(/\r?\n/)[0] || ""
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
          try { fs.unlinkSync(tmpFilePath) } catch (e) {}
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

    console.log("✅ [Preference Dataset Upload] Validation Completed: Header check passed")
    console.log("⚙️ [Preference Dataset Upload] CSV Stream Parsing Started...")

    // Parse CSV from disk file stream using PapaParse
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
    console.log(`[Preference Dataset Upload] CSV Parsed: ${rowsParsed} rows`)

    if (rowsParsed === 0) {
      if (tmpFilePath && fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath)
      return NextResponse.json({ success: false, error: "No data rows found in CSV file" }, { status: 400 })
    }

    const roundNumber = parseInt(round.replace(/\D/g, ""), 10) || 1

    // Step 2: Resolve or verify user ID
    let uploadedUserId = adminSession.userId
    const userRecord = await db.user.findFirst({
      where: { OR: [{ id: uploadedUserId }, { email: adminSession.email }] },
    })
    if (userRecord) {
      uploadedUserId = userRecord.id
    }

    // Step 3: Archive previous active dataset for this CAP Round
    const existingActive = await db.preferenceGeneratorDataset.findFirst({
      where: { round, status: "Active" },
    })

    const newVersion = existingActive ? existingActive.version + 1 : 1

    if (existingActive) {
      console.log(`[Preference Dataset Upload] Archiving active dataset ID ${existingActive.id} (v${existingActive.version})`)
      await db.preferenceGeneratorDataset.update({
        where: { id: existingActive.id },
        data: { status: "Inactive" },
      })
    }

    // Step 4: Create new active dataset record
    const dataset = await db.preferenceGeneratorDataset.create({
      data: {
        exam: "MHT CET PCM",
        round,
        uploadedByUserId: uploadedUserId,
        status: "Active",
        rowCount: rowsParsed,
        version: newVersion,
      },
    })

    // Save Dataset Version Log
    await db.preferenceDatasetVersion.create({
      data: {
        datasetId: dataset.id,
        version: newVersion,
        rowCount: rowsParsed,
        uploadedByUserId: uploadedUserId,
      },
    })

    console.log(`[Preference Dataset Upload] Dataset Activated: ${round} (v${newVersion}) ID: ${dataset.id}`)

    // Step 5: Map CSV data into database cutoff objects
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

    // Step 6: Batch insert cutoffs in chunks of 5,000
    const chunkSize = 5000
    let insertedCount = 0

    for (let i = 0; i < cutoffRows.length; i += chunkSize) {
      const chunk = cutoffRows.slice(i, i + chunkSize)
      await db.preferenceCutoff.createMany({
        data: chunk,
      })
      insertedCount += chunk.length
    }

    // Step 7: Save file to dataset/ folder for Preference Generator dataset loader
    try {
      const datasetDir = path.join(process.cwd(), "dataset")
      if (!fs.existsSync(datasetDir)) {
        fs.mkdirSync(datasetDir, { recursive: true })
      }
      const targetPath = path.join(datasetDir, `CAP Round ${roundNumber}.csv`)
      fs.copyFileSync(tmpFilePath, targetPath)
      console.log(`[Preference Dataset Upload] CSV file synced to: ${targetPath}`)
    } catch (copyErr) {
      console.warn(`[Preference Dataset Upload] Warning syncing CSV to dataset/ folder:`, copyErr)
    }

    // Delete temp file from disk
    if (tmpFilePath && fs.existsSync(tmpFilePath)) {
      try { fs.unlinkSync(tmpFilePath) } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: `${round} dataset uploaded successfully.`,
      rowsImported: insertedCount,
      round: roundNumber,
      datasetVersion: newVersion,
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
      try { fs.unlinkSync(tmpFilePath) } catch (e) {}
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Upload failed due to a server processing error. Please try again.",
        details: error?.stack || null,
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
