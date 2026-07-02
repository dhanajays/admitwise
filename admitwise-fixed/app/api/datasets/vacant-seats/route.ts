import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
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
    }
  }

  // 2. Fallback to NextAuth session
  const session = (await getServerSession(authOptions)) as CustomSession | null
  if (session && session.user) {
    if (allowedRoles.includes(session.user.role)) {
      return session
    }
  }

  return null
}

export async function GET() {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const datasets = await db.vacantSeatDataset.findMany({
      orderBy: { uploadedAt: "desc" },
      include: {
        uploadedByUser: {
          select: { name: true, email: true },
        },
      },
    })

    return NextResponse.json(datasets)
  } catch (error) {
    console.error("Error in /api/datasets/vacant-seats GET:", error)
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
      "Round",
      "Institute_Code",
      "Institute_Name",
      "Institute_Type",
      "Choice_Code",
      "Course_Name",
      "CAP_Seats",
      "MS_Seats",
      "Minority_Seats",
      "All_India_Seats",
      "Institute_Seats",
      "Orphan_Seats",
      "OPEN_G",
      "OPEN_L",
      "SC_G",
      "SC_L",
      "ST_G",
      "ST_L",
      "VJDT_G",
      "VJDT_L",
      "NTB_G",
      "NTB_L",
      "NTC_G",
      "NTC_L",
      "NTD_G",
      "NTD_L",
      "OBC_G",
      "OBC_L",
      "SEBC_G",
      "SEBC_L",
      "PWD_Common",
      "DEF_Common",
      "EWS_Seats",
      "TFWS_Seats"
    ]

    const headers = Object.keys(rows[0] || {})
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `Missing required CSV headers: ${missingHeaders.join(", ")}` },
        { status: 400 }
      )
    }

    // Helper parser for safe integer values
    const toInt = (val: any): number => {
      if (val === undefined || val === null) return 0
      const parsedVal = parseInt(val, 10)
      return isNaN(parsedVal) ? 0 : parsedVal
    }

    // Create the dataset record first
    const dataset = await db.vacantSeatDataset.create({
      data: {
        year,
        exam,
        round,
        uploadedByUserId: session.user.id,
        status: "Active",
        rowCount: rows.length,
      },
    })

    // Prepare vacant seat records
    const vacantSeatsData = rows.map((row) => ({
      datasetId: dataset.id,
      round: row["Round"] || round,
      instituteCode: String(row["Institute_Code"] || "").trim(),
      instituteName: String(row["Institute_Name"] || "").trim(),
      instituteType: String(row["Institute_Type"] || "").trim(),
      choiceCode: String(row["Choice_Code"] || "").trim(),
      courseName: String(row["Course_Name"] || "").trim(),
      capSeats: toInt(row["CAP_Seats"]),
      msSeats: toInt(row["MS_Seats"]),
      minoritySeats: toInt(row["Minority_Seats"]),
      allIndiaSeats: toInt(row["All_India_Seats"]),
      instituteSeats: toInt(row["Institute_Seats"]),
      orphanSeats: toInt(row["Orphan_Seats"]),
      openG: toInt(row["OPEN_G"]),
      openL: toInt(row["OPEN_L"]),
      scG: toInt(row["SC_G"]),
      scL: toInt(row["SC_L"]),
      stG: toInt(row["ST_G"]),
      stL: toInt(row["ST_L"]),
      vjdtG: toInt(row["VJDT_G"]),
      vjdtL: toInt(row["VJDT_L"]),
      ntbG: toInt(row["NTB_G"]),
      ntbL: toInt(row["NTB_L"]),
      ntcG: toInt(row["NTC_G"]),
      ntcL: toInt(row["NTC_L"]),
      ntdG: toInt(row["NTD_G"]),
      ntdL: toInt(row["NTD_L"]),
      obcG: toInt(row["OBC_G"]),
      obcL: toInt(row["OBC_L"]),
      sebcG: toInt(row["SEBC_G"]),
      sebcL: toInt(row["SEBC_L"]),
      pwdCommon: toInt(row["PWD_Common"]),
      defCommon: toInt(row["DEF_Common"]),
      ewsSeats: toInt(row["EWS_Seats"]),
      tfwsSeats: toInt(row["TFWS_Seats"]),
    }))

    // Batch insert vacant seats
    await db.vacantSeat.createMany({
      data: vacantSeatsData,
    })

    // Automatically deactivate other active datasets for the exact same year + exam + round
    await db.vacantSeatDataset.updateMany({
      where: {
        year,
        exam,
        round,
        id: { not: dataset.id },
      },
      data: { status: "Inactive" },
    })

    return NextResponse.json({
      success: true,
      message: `Dataset uploaded and ${rows.length} rows imported successfully`,
      dataset,
    })
  } catch (error) {
    console.error("Error in /api/datasets/vacant-seats POST:", error)
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

    const dataset = await db.vacantSeatDataset.findUnique({ where: { id } })
    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
    }

    if (status === "Active") {
      // Deactivate other active datasets for the same year + exam + round
      await db.vacantSeatDataset.updateMany({
        where: {
          year: dataset.year,
          exam: dataset.exam,
          round: dataset.round,
          id: { not: id },
        },
        data: { status: "Inactive" },
      })
    }

    const updated = await db.vacantSeatDataset.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ success: true, message: "Dataset status updated", dataset: updated })
  } catch (error) {
    console.error("Error in /api/datasets/vacant-seats PUT:", error)
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

    const dataset = await db.vacantSeatDataset.findUnique({ where: { id } })
    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
    }

    // Deleting the dataset will cascade-delete the VacantSeat rows due to schema relation definition
    await db.vacantSeatDataset.delete({ where: { id } })

    return NextResponse.json({ success: true, message: "Dataset deleted successfully" })
  } catch (error) {
    console.error("Error in /api/datasets/vacant-seats DELETE:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
