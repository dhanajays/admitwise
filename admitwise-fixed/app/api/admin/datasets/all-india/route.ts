import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import Papa from "papaparse"
import { getAdminSession } from "@/lib/admin-auth"

async function checkSuperAdmin() {
  const allowedRoles = ["Super Admin"]

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
    const session = await checkSuperAdmin()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const datasets = await db.allIndiaDataset.findMany({
      orderBy: { uploadedAt: "desc" },
      include: {
        uploadedByUser: {
          select: { name: true, email: true },
        },
      },
    })

    return NextResponse.json(datasets)
  } catch (error) {
    console.error("Error in /api/admin/datasets/all-india GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  console.log("\n[All India Upload] Request received");
  try {
    const session = await checkSuperAdmin()
    if (!session) {
      console.warn("[All India Upload] Validation result: Unauthorized access attempt.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const yearStr = formData.get("year") as string
    const round = formData.get("round") as string

    if (!file) {
      console.error("[All India Upload] Validation result: File is missing.");
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    console.log(`[All India Upload] Uploaded filename: ${file.name}`);
    console.log(`[All India Upload] File size: ${file.size} bytes`);
    console.log(`[All India Upload] Selected admission year: ${yearStr}`);
    console.log(`[All India Upload] Selected CAP round: ${round}`);

    if (!yearStr || !round) {
      console.error("[All India Upload] Validation result: Missing year or round.");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const year = parseInt(yearStr, 10)
    if (isNaN(year)) {
      console.error("[All India Upload] Validation result: Invalid year format.");
      return NextResponse.json({ error: "Invalid year format" }, { status: 400 })
    }

    const fileContent = await file.text()

    // Map database field names to normalized lowercase keys
    const headerMap: Record<string, string> = {
      "round": "Round",
      "institute_code": "Institute_Code",
      "institute_name": "Institute_Name",
      "choice_code": "Choice_Code",
      "course_name": "Course_Name",
      "merit_exam": "Merit_Exam",
      "admission_type": "Admission_Type",
      "seat_type": "Seat_Type",
      "closing_all_india_merit": "Closing_All_India_Merit",
      "closing_percentile": "Closing_Percentile",
      "gender": "Gender",
      "category": "Category",
      "pwd": "PWD",
      "defence": "Defence",
      "home_university": "Home_University",
      "available_for_all_india": "Available_For_All_India"
    }

    // Parse CSV with header transformations to handle spacing & casing mismatch
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        const clean = header.trim().toLowerCase().replace(/[\s\-_]+/g, "_")
        if (headerMap[clean]) return headerMap[clean]
        return header.trim()
      }
    })

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      console.error("[All India Upload] Validation result: CSV Parse Errors:", parsed.errors)
      return NextResponse.json(
        { error: "Failed to parse CSV file", details: parsed.errors },
        { status: 400 }
      )
    }

    const rows = parsed.data as any[]
    console.log(`[All India Upload] Parsed row count: ${rows.length}`);
    if (rows.length === 0) {
      console.error("[All India Upload] Validation result: CSV file is empty.");
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 })
    }

    // Validate normalized headers are present
    const requiredHeaders = [
      "Round",
      "Institute_Code",
      "Institute_Name",
      "Choice_Code",
      "Course_Name",
      "Merit_Exam",
      "Admission_Type",
      "Seat_Type",
      "Closing_All_India_Merit",
      "Closing_Percentile",
      "Gender",
      "Category",
      "PWD",
      "Defence",
      "Home_University",
      "Available_For_All_India"
    ]

    const firstRow = rows[0]
    const missingHeaders = requiredHeaders.filter((h) => !(h in firstRow))

    if (missingHeaders.length > 0) {
      console.error("[All India Upload] Validation result: Missing headers:", missingHeaders);
      return NextResponse.json(
        { error: `Missing CSV columns: ${missingHeaders.join(", ")}. Please check column naming.` },
        { status: 400 }
      )
    }

    // Row-by-row structure validation
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // 1-indexed (line 1 is headers)

      if (!row.Round || !row.Round.trim()) {
        console.error(`[All India Upload] Validation result: Row ${rowNum} is missing Round.`);
        return NextResponse.json({ error: `Validation Failure at Row ${rowNum}, Column 'Round': Value must not be empty.` }, { status: 400 })
      }
      if (!row.Institute_Code || !row.Institute_Code.trim()) {
        console.error(`[All India Upload] Validation result: Row ${rowNum} is missing Institute_Code.`);
        return NextResponse.json({ error: `Validation Failure at Row ${rowNum}, Column 'Institute_Code': Value must not be empty.` }, { status: 400 })
      }
      if (!row.Institute_Name || !row.Institute_Name.trim()) {
        console.error(`[All India Upload] Validation result: Row ${rowNum} is missing Institute_Name.`);
        return NextResponse.json({ error: `Validation Failure at Row ${rowNum}, Column 'Institute_Name': Value must not be empty.` }, { status: 400 })
      }
      if (!row.Choice_Code || !row.Choice_Code.trim()) {
        console.error(`[All India Upload] Validation result: Row ${rowNum} is missing Choice_Code.`);
        return NextResponse.json({ error: `Validation Failure at Row ${rowNum}, Column 'Choice_Code': Value must not be empty.` }, { status: 400 })
      }
      if (!row.Course_Name || !row.Course_Name.trim()) {
        console.error(`[All India Upload] Validation result: Row ${rowNum} is missing Course_Name.`);
        return NextResponse.json({ error: `Validation Failure at Row ${rowNum}, Column 'Course_Name': Value must not be empty.` }, { status: 400 })
      }

      const examVal = (row.Merit_Exam || "").trim()
      if (!["JEE(Main)", "MHT-CET", "NEET"].includes(examVal)) {
        console.error(`[All India Upload] Validation result: Row ${rowNum} has invalid Merit_Exam: ${examVal}.`);
        return NextResponse.json({ error: `Validation Failure at Row ${rowNum}, Column 'Merit_Exam': Expected JEE(Main), MHT-CET, or NEET. Got '${examVal}'.` }, { status: 400 })
      }

      const closingMerit = parseInt(row.Closing_All_India_Merit, 10)
      if (isNaN(closingMerit) || closingMerit < 0) {
        console.error(`[All India Upload] Validation result: Row ${rowNum} has invalid Closing_All_India_Merit: ${row.Closing_All_India_Merit}.`);
        return NextResponse.json({ error: `Validation Failure at Row ${rowNum}, Column 'Closing_All_India_Merit': Expected non-negative integer. Got '${row.Closing_All_India_Merit}'.` }, { status: 400 })
      }

      const closingPerc = parseFloat(row.Closing_Percentile)
      if (isNaN(closingPerc) || closingPerc < 0) {
        console.error(`[All India Upload] Validation result: Row ${rowNum} has invalid Closing_Percentile: ${row.Closing_Percentile}.`);
        return NextResponse.json({ error: `Validation Failure at Row ${rowNum}, Column 'Closing_Percentile': Expected non-negative numeric value. Got '${row.Closing_Percentile}'.` }, { status: 400 })
      }

      const pwdVal = (row.PWD || "").trim()
      if (pwdVal !== "Yes" && pwdVal !== "No") {
        console.error(`[All India Upload] Validation result: Row ${rowNum} has invalid PWD value: ${pwdVal}.`);
        return NextResponse.json({ error: `Validation Failure at Row ${rowNum}, Column 'PWD': Expected 'Yes' or 'No'. Got '${pwdVal}'.` }, { status: 400 })
      }

      const defenceVal = (row.Defence || "").trim()
      if (defenceVal !== "Yes" && defenceVal !== "No") {
        console.error(`[All India Upload] Validation result: Row ${rowNum} has invalid Defence value: ${defenceVal}.`);
        return NextResponse.json({ error: `Validation Failure at Row ${rowNum}, Column 'Defence': Expected 'Yes' or 'No'. Got '${defenceVal}'.` }, { status: 400 })
      }

      const avAI = (row.Available_For_All_India || "").trim()
      if (avAI !== "Yes" && avAI !== "No") {
        console.error(`[All India Upload] Validation result: Row ${rowNum} has invalid Available_For_All_India value: ${avAI}.`);
        return NextResponse.json({ error: `Validation Failure at Row ${rowNum}, Column 'Available_For_All_India': Expected 'Yes' or 'No'. Got '${avAI}'.` }, { status: 400 })
      }
    }

    console.log("[All India Upload] Validation result: Success. All rows validated.");

    // Deactivate previous active datasets of same year + round
    console.log("[All India Upload] Deactivating previous active datasets of same year & round...");
    await db.allIndiaDataset.updateMany({
      where: {
        year,
        round,
        status: "Active",
      },
      data: {
        status: "Inactive",
      },
    })

    // Create new Dataset record
    console.log("[All India Upload] Creating new Dataset record in DB...");
    const dataset = await db.allIndiaDataset.create({
      data: {
        year,
        round,
        rowCount: rows.length,
        status: "Active",
        uploadedByUserId: session.user.id,
        filePath: file.name,
      },
    })

    // Batch insert cutoffs in chunks of 2000
    console.log("[All India Upload] Chunking and inserting cutoff records...");
    const cutoffData = rows.map((row) => ({
      datasetId: dataset.id,
      round: (row.Round || "").trim(),
      instituteCode: (row.Institute_Code || "").trim(),
      instituteName: (row.Institute_Name || "").trim(),
      choiceCode: (row.Choice_Code || "").trim(),
      courseName: (row.Course_Name || "").trim(),
      meritExam: (row.Merit_Exam || "").trim(),
      admissionType: (row.Admission_Type || "").trim(),
      seatType: (row.Seat_Type || "").trim(),
      closingAllIndiaMerit: parseInt(row.Closing_All_India_Merit, 10) || 0,
      closingPercentile: parseFloat(row.Closing_Percentile) || 0.0,
      gender: (row.Gender || "").trim(),
      category: (row.Category || "").trim(),
      pwd: (row.PWD || "No").trim(),
      defense: (row.Defence || "No").trim(),
      homeUniversity: (row.Home_University || "").trim(),
      availableForAllIndia: (row.Available_For_All_India || "No").trim(),
    }))

    const chunkSize = 2000
    for (let i = 0; i < cutoffData.length; i += chunkSize) {
      const chunk = cutoffData.slice(i, i + chunkSize)
      await db.allIndiaCutoff.createMany({
        data: chunk,
      })
      console.log(`[All India Upload] Database insert/update result: Chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(cutoffData.length / chunkSize)} inserted (${chunk.length} rows).`);
    }

    console.log("[All India Upload] Database insert/update result: Success. All records inserted.");

    // Log action
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ALL_INDIA_DATASET_UPLOAD",
        details: `Uploaded All India dataset: ${year} ${round} (${rows.length} rows)`,
      },
    })

    console.log("[All India Upload] Final success message: Upload completed successfully.");
    return NextResponse.json({
      success: true,
      message: `All India Dataset uploaded and ${rows.length} rows imported successfully`,
      datasetId: dataset.id,
      rowCount: rows.length,
      invalidCount: 0,
    })
  } catch (error: any) {
    console.error("[All India Upload] Final error message: Crash:", error.message || error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await checkSuperAdmin()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, status } = await req.json()
    if (!id || !status) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const dataset = await db.allIndiaDataset.findUnique({ where: { id } })
    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
    }

    if (status === "Active") {
      // Deactivate other matching datasets
      await db.allIndiaDataset.updateMany({
        where: {
          year: dataset.year,
          round: dataset.round,
          status: "Active",
        },
        data: { status: "Inactive" },
      })
    }

    await db.allIndiaDataset.update({
      where: { id },
      data: { status },
    })

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ALL_INDIA_DATASET_STATUS_TOGGLE",
        details: `Set status of All India dataset ${dataset.year} ${dataset.round} to ${status}`,
      },
    })

    return NextResponse.json({ success: true, message: "Dataset status updated" })
  } catch (error) {
    console.error("Error in /api/admin/datasets/all-india PUT:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await checkSuperAdmin()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Dataset ID is required" }, { status: 400 })
    }

    const dataset = await db.allIndiaDataset.findUnique({ where: { id } })
    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
    }

    await db.allIndiaDataset.delete({ where: { id } })

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ALL_INDIA_DATASET_DELETE",
        details: `Deleted All India dataset ${dataset.year} ${dataset.round}`,
      },
    })

    return NextResponse.json({ success: true, message: "Dataset deleted successfully" })
  } catch (error) {
    console.error("Error in /api/admin/datasets/all-india DELETE:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
