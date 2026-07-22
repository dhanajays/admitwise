import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import Papa from "papaparse"
import fs from "fs"
import path from "path"
import os from "os"

export const maxDuration = 300 // 5 minutes execution limit for merging & database batching
export const dynamic = "force-dynamic"

const COLUMN_ALIASES: Record<string, string[]> = {
  college_code: ["college_code", "collegecode"],
  college_name: ["college_name", "collegename"],
  branch_code: ["branch_code", "branchcode"],
  branch_name: ["branch_name", "branchname"],
  status: ["status"],
  home_university: ["home_university", "homeuniversity"],
  seat_section: ["seat_section", "seatsection"],
  stage: ["stage"],
  category_code: ["category_code_raw", "category_code", "categorycode", "category"],
  gender: ["gender"],
  disability: ["disability"],
  defense_q: ["defense_quota", "defense_q", "defenseq"],
  closing_rank: ["closing_rank", "closingrank"],
  closing_percentile: ["closing_percentile", "closingpercentile"],
  city: ["city"],
}

function normalizeCapRound(input: string): string {
  const clean = input.trim().toLowerCase()
  if (clean.includes("2") || clean === "2") return "Round 2"
  if (clean.includes("3") || clean === "3") return "Round 3"
  if (clean.includes("4") || clean === "4") return "Round 4"
  return "Round 1"
}

async function checkAdminRole() {
  try {
    const adminSession = await getAdminSession()
    if (!adminSession || !["Super Admin", "Manager"].includes(adminSession.role)) {
      return null
    }
    return adminSession
  } catch (err) {
    console.error("[Chunk API] Admin check failed:", err)
    return null
  }
}

// GET Handler to query already uploaded chunks for Resume support
export async function GET(req: Request) {
  try {
    const adminSession = await checkAdminRole()
    if (!adminSession) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const uploadId = searchParams.get("uploadId")

    if (!uploadId) {
      return NextResponse.json({ success: false, error: "uploadId is required" }, { status: 400 })
    }

    const chunkDir = path.join(os.tmpdir(), `pref_chunks_${uploadId}`)
    if (!fs.existsSync(chunkDir)) {
      return NextResponse.json({ success: true, uploadedChunks: [] })
    }

    const files = fs.readdirSync(chunkDir)
    const uploadedChunks = files
      .filter((f) => f.startsWith("chunk_") && f.endsWith(".tmp"))
      .map((f) => parseInt(f.replace("chunk_", "").replace(".tmp", ""), 10))
      .filter((idx) => !isNaN(idx))
      .sort((a, b) => a - b)

    return NextResponse.json({ success: true, uploadedChunks })
  } catch (err: any) {
    console.error("❌ [Chunk GET Error]:", err?.stack || err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// POST Handler to receive a single 3MB chunk or finalize merge on last chunk
export async function POST(req: Request) {
  const startTime = Date.now()

  try {
    const adminSession = await checkAdminRole()
    if (!adminSession) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 })
    }

    const formData = await req.formData()
    const uploadId = (formData.get("uploadId") as string || "").trim()
    const chunkIndexStr = formData.get("chunkIndex") as string
    const totalChunksStr = formData.get("totalChunks") as string
    const roundRaw = (formData.get("round") as string || "Round 1").trim()
    const fileName = (formData.get("filename") as string || "dataset.csv").trim()
    const chunkFile = formData.get("chunk") as File | null

    if (!uploadId || chunkIndexStr === null || !totalChunksStr || !chunkFile) {
      return NextResponse.json(
        { success: false, error: "uploadId, chunkIndex, totalChunks, and chunk file are required." },
        { status: 400 }
      )
    }

    const chunkIndex = parseInt(chunkIndexStr, 10)
    const totalChunks = parseInt(totalChunksStr, 10)
    const round = normalizeCapRound(roundRaw)

    if (isNaN(chunkIndex) || isNaN(totalChunks) || totalChunks <= 0) {
      return NextResponse.json({ success: false, error: "Invalid chunk parameters" }, { status: 400 })
    }

    // Prepare temp directory for chunks
    const chunkDir = path.join(os.tmpdir(), `pref_chunks_${uploadId}`)
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true })
    }

    // Save chunk file to temp directory
    const chunkFilePath = path.join(chunkDir, `chunk_${chunkIndex}.tmp`)
    const chunkBuffer = Buffer.from(await chunkFile.arrayBuffer())
    fs.writeFileSync(chunkFilePath, chunkBuffer)

    console.log(`📦 [Chunk Upload] Received Chunk ${chunkIndex + 1}/${totalChunks} for uploadId ${uploadId} (${(chunkBuffer.length / (1024 * 1024)).toFixed(2)} MB)`)

    // If not the final chunk, return success chunk confirmation
    if (chunkIndex < totalChunks - 1) {
      return NextResponse.json({
        success: true,
        completed: false,
        chunkIndex,
        totalChunks,
        received: true,
      })
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FINAL CHUNK ARRIVED: Merge, Validate, Stream & Batch Insert
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`🔄 [Chunk Upload] Final Chunk ${totalChunks}/${totalChunks} received. Merging file...`)

    // 1. Check all chunks exist
    const missingChunks: number[] = []
    for (let i = 0; i < totalChunks; i++) {
      const p = path.join(chunkDir, `chunk_${i}.tmp`)
      if (!fs.existsSync(p)) {
        missingChunks.push(i)
      }
    }

    if (missingChunks.length > 0) {
      console.error(`❌ [Chunk Upload] Merging failed. Missing chunks:`, missingChunks)
      return NextResponse.json(
        { success: false, error: `Missing ${missingChunks.length} chunk(s): ${missingChunks.join(", ")}` },
        { status: 400 }
      )
    }

    // 2. Reconstruct merged CSV file
    const mergedFilePath = path.join(os.tmpdir(), `pref_merged_${uploadId}_${Date.now()}.csv`)
    const mergedWriteStream = fs.createWriteStream(mergedFilePath)

    for (let i = 0; i < totalChunks; i++) {
      const p = path.join(chunkDir, `chunk_${i}.tmp`)
      const buf = fs.readFileSync(p)
      mergedWriteStream.write(buf)
    }

    mergedWriteStream.end()
    console.log(`✅ [Chunk Upload] Merged reconstructed file: ${mergedFilePath}`)

    // 3. Clean up chunk directory
    try {
      fs.rmSync(chunkDir, { recursive: true, force: true })
    } catch (e) {
      console.warn("Could not delete chunk directory:", e)
    }

    // 4. Validate CSV headers
    console.log("🔍 [Chunk Upload] Validating CSV structure...")
    const fileHeaderBuffer = Buffer.alloc(4096)
    const fd = fs.openSync(mergedFilePath, "r")
    fs.readSync(fd, fileHeaderBuffer, 0, 4096, 0)
    fs.closeSync(fd)

    const firstLine = fileHeaderBuffer.toString("utf-8").split(/\r?\n/)[0] || ""
    const headerCols = firstLine
      .split(",")
      .map((c) => c.trim().replace(/^["']|["']$/g, "").toLowerCase())

    console.log("[Chunk Upload] Extracted Headers:", headerCols)

    for (const [canonicalName, aliases] of Object.entries(COLUMN_ALIASES)) {
      const hasCol = headerCols.some((h) => {
        const normH = h.replace(/[^a-z0-9]/g, "")
        return aliases.some((alias) => {
          const normAlias = alias.replace(/[^a-z0-9]/g, "")
          return normH === normAlias || h === alias
        })
      })

      if (!hasCol) {
        console.warn(`⚠️ [Chunk Upload] Missing required column: ${canonicalName}`)
        if (fs.existsSync(mergedFilePath)) fs.unlinkSync(mergedFilePath)
        return NextResponse.json(
          { success: false, error: `Missing required column: ${canonicalName}` },
          { status: 400 }
        )
      }
    }

    console.log("✅ [Chunk Upload] CSV structure validation passed")

    // 5. Stream CSV file with PapaParse
    console.log("⚙️ [Chunk Upload] Stream parsing CSV data...")
    const fileStream = fs.createReadStream(mergedFilePath, { encoding: "utf-8" })

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
    console.log(`[Chunk Upload] Parsed ${rowsParsed} data rows`)

    if (rowsParsed === 0) {
      if (fs.existsSync(mergedFilePath)) fs.unlinkSync(mergedFilePath)
      return NextResponse.json({ success: false, error: "No data rows found in CSV file" }, { status: 400 })
    }

    // 6. User verification for database relation
    let uploadedUserId = adminSession.userId
    const userRecord = await db.user.findFirst({
      where: { OR: [{ id: uploadedUserId }, { email: adminSession.email }] },
    })
    if (userRecord) {
      uploadedUserId = userRecord.id
    }

    // 7. Archive previous dataset for this CAP Round
    const existingActive = await db.preferenceGeneratorDataset.findFirst({
      where: { round, status: "Active" },
    })

    const newVersion = existingActive ? existingActive.version + 1 : 1

    if (existingActive) {
      console.log(`[Chunk Upload] Archiving active dataset ID ${existingActive.id} (v${existingActive.version})`)
      await db.preferenceGeneratorDataset.update({
        where: { id: existingActive.id },
        data: { status: "Inactive" },
      })
    }

    // 8. Create active dataset record
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

    // Create Dataset Version log
    await db.preferenceDatasetVersion.create({
      data: {
        datasetId: dataset.id,
        version: newVersion,
        rowCount: rowsParsed,
        uploadedByUserId: uploadedUserId,
      },
    })

    // 9. Map CSV rows into cutoff database records
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

    // 10. Batch insert into database in chunks of 5,000
    const chunkSize = 5000
    let insertedCount = 0

    for (let i = 0; i < cutoffRows.length; i += chunkSize) {
      const chunk = cutoffRows.slice(i, i + chunkSize)
      await db.preferenceCutoff.createMany({
        data: chunk,
      })
      insertedCount += chunk.length
    }

    console.log(`[Chunk Upload] Rows Imported: ${insertedCount}`)
    console.log(`🎉 [Chunk Upload] Completed in ${(Date.now() - startTime)}ms`)

    // 11. Delete merged temporary file
    if (fs.existsSync(mergedFilePath)) {
      try { fs.unlinkSync(mergedFilePath) } catch (e) {}
    }

    const roundNumber = parseInt(round.replace(/\D/g, ""), 10) || 1

    return NextResponse.json({
      success: true,
      completed: true,
      rowsImported: insertedCount,
      round: roundNumber,
      message: `${round} dataset uploaded and activated successfully.`,
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
    console.error("❌ [Chunk Upload Fatal Error]:", error?.stack || error)
    return NextResponse.json(
      { success: false, error: error.message || "Chunk upload processing failed", details: error?.stack },
      { status: 500 }
    )
  }
}
