import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import Papa from "papaparse"

async function checkAdminRole() {
  const adminSession = await getAdminSession()
  if (!adminSession || !["Super Admin", "Manager"].includes(adminSession.role)) {
    return null
  }
  return adminSession
}

export async function GET(req: Request) {
  try {
    const adminSession = await checkAdminRole()
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    return NextResponse.json(datasets)
  } catch (error: any) {
    console.error("Error in GET /api/admin/preference-dataset:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const adminSession = await checkAdminRole()
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const round = (formData.get("round") as string) || "Round 1"

    if (!file || !round) {
      return NextResponse.json({ error: "File and CAP Round are required" }, { status: 400 })
    }

    const fileContent = await file.text()
    const parsed = Papa.parse<any>(fileContent, {
      header: true,
      skipEmptyLines: true,
    })

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: "CSV Parsing Error", details: parsed.errors },
        { status: 400 }
      )
    }

    // Find existing dataset version count
    const existingActive = await db.preferenceGeneratorDataset.findFirst({
      where: { round, status: "Active" },
    })

    const newVersion = existingActive ? existingActive.version + 1 : 1

    // Mark previous active dataset as Inactive
    if (existingActive) {
      await db.preferenceGeneratorDataset.update({
        where: { id: existingActive.id },
        data: { status: "Inactive" },
      })
    }

    // Create new active dataset
    const dataset = await db.preferenceGeneratorDataset.create({
      data: {
        exam: "MHT CET PCM",
        round,
        uploadedByUserId: adminSession.userId,
        status: "Active",
        rowCount: parsed.data.length,
        version: newVersion,
      },
    })

    // Create version record
    await db.preferenceDatasetVersion.create({
      data: {
        datasetId: dataset.id,
        version: newVersion,
        rowCount: parsed.data.length,
        uploadedByUserId: adminSession.userId,
      },
    })

    // Prepare cutoffs batch insert
    const cutoffRows = parsed.data
      .map((row: any) => {
        const collegeCode = String(row.college_code || row.collegeCode || "").trim()
        const collegeName = String(row.college_name || row.collegeName || "").trim()
        const branchCode = String(row.branch_code || row.branchCode || "").trim()
        const branchName = String(row.branch_name || row.branchName || "").trim()
        const status = String(row.status || "").trim()
        const homeUniversity = String(row.home_university || row.homeUniversity || "").trim()
        const seatSection = String(row.seat_section || row.seatSection || "").trim()
        const stage = String(row.stage || "").trim()
        const categoryCodeRaw = String(row.category_code || row.categoryCode || row.category || "").trim()
        const gender = String(row.gender || "").trim()
        const disability = String(row.disability || "No").trim()
        const defenseQuota = String(row.defense_q || row.defenseQuota || "No").trim()
        const closingRank = parseInt(row.closing_rank || row.closingRank || "0", 10)
        const closingPercentile = parseFloat(row.closing_percentile || row.closingPercentile || "0")
        const city = String(row.city || "").trim()

        if (!collegeName || !branchName || isNaN(closingPercentile)) {
          return null
        }

        return {
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
        }
      })
      .filter(Boolean) as any[]

    // Batch insert cutoffs in chunks of 5000
    const chunkSize = 5000
    for (let i = 0; i < cutoffRows.length; i += chunkSize) {
      const chunk = cutoffRows.slice(i, i + chunkSize)
      await db.preferenceCutoff.createMany({
        data: chunk,
      })
    }

    return NextResponse.json({
      success: true,
      dataset: {
        id: dataset.id,
        round: dataset.round,
        rowCount: dataset.rowCount,
        version: dataset.version,
      },
    })
  } catch (error: any) {
    console.error("Error in POST /api/admin/preference-dataset:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const adminSession = await checkAdminRole()
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Dataset ID is required" }, { status: 400 })
    }

    await db.preferenceGeneratorDataset.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in DELETE /api/admin/preference-dataset:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
