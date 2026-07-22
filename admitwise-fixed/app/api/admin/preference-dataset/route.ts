import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import Papa from "papaparse"

export const maxDuration = 300 // 5 minutes timeout for large datasets
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
  console.log("🚀 [Preference Dataset Upload] Upload API invoked")

  try {
    const adminSession = await checkAdminRole()
    if (!adminSession) {
      console.warn("⚠️ [Preference Dataset Upload] Unauthorized attempt")
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 })
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch (formErr: any) {
      console.error("❌ [Preference Dataset Upload] FormData parsing failed:", formErr)
      return NextResponse.json(
        {
          success: false,
          error: "Dataset file is too large for the server. Maximum allowed file size is 30 MB.",
        },
        { status: 413 }
      )
    }

    const file = formData.get("file") as File | null
    const round = (formData.get("round") as string || "Round 1").trim()

    if (!file) {
      return NextResponse.json({ success: false, error: "CSV file is required" }, { status: 400 })
    }

    console.log(`[Preference Dataset Upload] Started: round=${round}, fileName=${file.name}, size=${(file.size / (1024 * 1024)).toFixed(2)} MB, user=${adminSession.userId}`)

    // Read CSV file text
    const fileContent = await file.text()

    if (!fileContent || fileContent.trim().length === 0) {
      return NextResponse.json({ success: false, error: "CSV file is empty" }, { status: 400 })
    }

    // Step 1: Validate Header Columns before full parse
    const firstLine = fileContent.split(/\r?\n/)[0] || ""
    const headerCols = firstLine
      .split(",")
      .map((c) => c.trim().replace(/^["']|["']$/g, "").toLowerCase())

    console.log("[Preference Dataset Upload] Extracted CSV Headers:", headerCols)

    for (const requiredCol of REQUIRED_COLUMNS) {
      // Allow flexible matches (e.g. college_code or collegecode)
      const hasCol = headerCols.some((h) => {
        const normH = h.replace(/[^a-z0-9]/g, "")
        const normReq = requiredCol.replace(/[^a-z0-9]/g, "")
        return normH === normReq || h === requiredCol
      })

      if (!hasCol) {
        console.warn(`⚠️ [Preference Dataset Upload] Missing required column: ${requiredCol}`)
        return NextResponse.json(
          {
            success: false,
            error: `Missing required column: ${requiredCol}`,
          },
          { status: 400 }
        )
      }
    }

    console.log("✅ [Preference Dataset Upload] Column validation passed")

    // Step 2: Parse CSV rows
    const parsed = Papa.parse<any>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    })

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      console.error("❌ [Preference Dataset Upload] Papaparse error:", parsed.errors)
      return NextResponse.json(
        { success: false, error: "CSV format is invalid or corrupted." },
        { status: 400 }
      )
    }

    const totalRowsCount = parsed.data.length
    console.log(`[Preference Dataset Upload] CSV parsed successfully: ${totalRowsCount} rows in ${(Date.now() - startTime)}ms`)

    if (totalRowsCount === 0) {
      return NextResponse.json({ success: false, error: "No data rows found in CSV" }, { status: 400 })
    }

    // Step 3: Deactivate existing active dataset for this round
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

    // Step 4: Create new active dataset record
    const dataset = await db.preferenceGeneratorDataset.create({
      data: {
        exam: "MHT CET PCM",
        round,
        uploadedByUserId: adminSession.userId,
        status: "Active",
        rowCount: totalRowsCount,
        version: newVersion,
      },
    })

    // Create Dataset Version history
    await db.preferenceDatasetVersion.create({
      data: {
        datasetId: dataset.id,
        version: newVersion,
        rowCount: totalRowsCount,
        uploadedByUserId: adminSession.userId,
      },
    })

    console.log(`[Preference Dataset Upload] Created active dataset ID ${dataset.id} (v${newVersion})`)

    // Step 5: Map CSV data into database rows
    const cutoffRows: any[] = []
    for (let idx = 0; idx < parsed.data.length; idx++) {
      const row = parsed.data[idx]
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

    console.log(`[Preference Dataset Upload] Prepared ${cutoffRows.length} valid rows for database insertion`)

    // Batch insert cutoffs in chunks of 2,000 to prevent parameter limits
    const chunkSize = 2000
    let insertedCount = 0

    for (let i = 0; i < cutoffRows.length; i += chunkSize) {
      const chunk = cutoffRows.slice(i, i + chunkSize)
      await db.preferenceCutoff.createMany({
        data: chunk,
      })
      insertedCount += chunk.length
      console.log(`[Preference Dataset Upload] Inserted batch ${Math.ceil(insertedCount / chunkSize)} (${insertedCount}/${cutoffRows.length})`)
    }

    const duration = Date.now() - startTime
    console.log(`🎉 [Preference Dataset Upload] Successfully completed! Imported ${insertedCount} records for ${round} (v${newVersion}) in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: `Dataset uploaded successfully. ${insertedCount.toLocaleString()} records imported. ${round} dataset is now active.`,
      rows: insertedCount,
      round,
      version: newVersion,
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

