import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { clearCutoffsCache } from "@/lib/predictor/data"
import Papa from "papaparse"
import { getAdminSession } from "@/lib/admin-auth"

// Role enforcement helper
async function checkAdminRole() {
  const allowedRoles = ["Super Admin", "Manager"]

  // 1. Try custom admin token session first
  const adminSession = await getAdminSession()
  if (adminSession) {
    if (allowedRoles.includes(adminSession.role)) {
      return {
        user: {
          id: adminSession.userId,
          email: adminSession.email,
          name: adminSession.name,
          role: adminSession.role,
        }
      }
    } else {
      console.warn(`[Admin Auth Failure] /api/datasets: Role '${adminSession.role}' for user '${adminSession.email}' is not in allowed roles:`, allowedRoles)
    }
  }

  // 2. Fallback to NextAuth session
  const session = (await getServerSession(authOptions)) as CustomSession | null
  if (session && session.user) {
    if (allowedRoles.includes(session.user.role)) {
      return session
    } else {
      console.warn(`[Admin Auth Failure] /api/datasets: NextAuth Role '${session.user.role}' for user '${session.user.email}' is not in allowed roles:`, allowedRoles)
    }
  }

  if (!adminSession && !session) {
    console.warn("[Admin Auth Failure] /api/datasets: No active custom admin session or NextAuth session found.")
  }

  return null
}

export async function GET() {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const datasets = await db.dataset.findMany({
      orderBy: { uploadedAt: "desc" },
      include: {
        uploadedByUser: {
          select: { name: true, email: true },
        },
      },
    })

    return NextResponse.json(datasets)
  } catch (error) {
    console.error("Error in /api/datasets GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const yearStr = formData.get("year") as string
    const exam = formData.get("exam") as string
    const round = formData.get("round") as string

    if (!file || !yearStr || !exam || !round) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const year = parseInt(yearStr, 10)
    if (isNaN(year)) {
      return NextResponse.json({ error: "Invalid year format" }, { status: 400 })
    }

    const fileContent = await file.text()

    // Parse CSV
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    })

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: "Failed to parse CSV file", details: parsed.errors },
        { status: 400 }
      )
    }

    const rows = parsed.data as any[]
    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 })
    }

    // Validate headers
    const requiredHeaders = [
      "college_code",
      "college_name",
      "branch_code",
      "branch_name",
      "status",
      "home_university",
      "seat_section",
      "stage",
      "category_code_raw",
      "category",
      "gender",
      "disability",
      "defense_quota",
      "closing_rank",
      "closing_percentile",
    ]

    const firstRow = rows[0]
    const missingHeaders = requiredHeaders.filter((h) => !(h in firstRow))

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `Missing CSV columns: ${missingHeaders.join(", ")}` },
        { status: 400 }
      )
    }

    // Deactivate previous active datasets of same year + exam + round
    await db.dataset.updateMany({
      where: {
        year,
        exam,
        round,
        status: "Active",
      },
      data: {
        status: "Inactive",
      },
    })

    // Create new Dataset record
    const dataset = await db.dataset.create({
      data: {
        year,
        exam,
        round,
        rowCount: rows.length,
        status: "Active",
        uploadedByUserId: session.user.id,
      },
    })

    // Batch insert cutoffs
    const cutoffData = rows.map((row) => ({
      datasetId: dataset.id,
      collegeCode: (row.college_code || "").trim(),
      collegeName: (row.college_name || "").trim(),
      branchCode: (row.branch_code || "").trim(),
      branchName: (row.branch_name || "").trim(),
      status: (row.status || "").trim(),
      homeUniversity: (row.home_university || "").trim(),
      seatSection: (row.seat_section || "").trim(),
      stage: (row.stage || "I").trim(),
      categoryCodeRaw: (row.category_code_raw || "").trim(),
      category: (row.category || "").trim(),
      gender: (row.gender || "Not Specified").trim(),
      disability: (row.disability || "No").trim(),
      defenseQuota: (row.defense_quota || "No").trim(),
      closingRank: parseInt(row.closing_rank, 10) || 0,
      closingPercentile: parseFloat(row.closing_percentile) || 0.0,
    }))

    await db.cutoff.createMany({
      data: cutoffData,
    })

    // Clear prediction engine cutoff cache
    clearCutoffsCache()

    // Create DatasetVersion
    await db.datasetVersion.create({
      data: {
        datasetId: dataset.id,
        version: 1,
        description: `Initial upload of ${year} ${exam} ${round}`,
        isActive: true,
      },
    })

    // Log action
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DATASET_UPLOAD",
        details: `Uploaded dataset: ${year} ${exam} ${round} (${rows.length} rows)`,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Dataset uploaded and ${rows.length} rows imported successfully`,
      datasetId: dataset.id,
    })
  } catch (error) {
    console.error("Error in /api/datasets POST:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, status } = await req.json()
    if (!id || !status) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const dataset = await db.dataset.findUnique({ where: { id } })
    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
    }

    if (status === "Active") {
      // Deactivate other matching datasets
      await db.dataset.updateMany({
        where: {
          year: dataset.year,
          exam: dataset.exam,
          round: dataset.round,
          status: "Active",
        },
        data: { status: "Inactive" },
      })
    }

    await db.dataset.update({
      where: { id },
      data: { status },
    })

    clearCutoffsCache()

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DATASET_STATUS_TOGGLE",
        details: `Set status of dataset ${dataset.year} ${dataset.exam} ${dataset.round} to ${status}`,
      },
    })

    return NextResponse.json({ success: true, message: "Dataset status updated" })
  } catch (error) {
    console.error("Error in /api/datasets PUT:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Dataset ID is required" }, { status: 400 })
    }

    const dataset = await db.dataset.findUnique({ where: { id } })
    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
    }

    // Cascade delete is configured in schema, so deleting the dataset deletes all cutoffs
    await db.dataset.delete({ where: { id } })

    clearCutoffsCache()

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DATASET_DELETE",
        details: `Deleted dataset ${dataset.year} ${dataset.exam} ${dataset.round}`,
      },
    })

    return NextResponse.json({ success: true, message: "Dataset deleted successfully" })
  } catch (error) {
    console.error("Error in /api/datasets DELETE:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
