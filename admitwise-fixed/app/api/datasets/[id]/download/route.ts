import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"

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
      console.warn(`[Admin Auth Failure] /api/datasets/[id]/download: Role '${adminSession.role}' for user '${adminSession.email}' is not in allowed roles:`, allowedRoles)
    }
  }

  // 2. Fallback to NextAuth session
  const session = (await getServerSession(authOptions)) as CustomSession | null
  if (session && session.user) {
    if (allowedRoles.includes(session.user.role)) {
      return session
    } else {
      console.warn(`[Admin Auth Failure] /api/datasets/[id]/download: NextAuth Role '${session.user.role}' for user '${session.user.email}' is not in allowed roles:`, allowedRoles)
    }
  }

  if (!adminSession && !session) {
    console.warn("[Admin Auth Failure] /api/datasets/[id]/download: No active custom admin session or NextAuth session found.")
  }

  return null
}

const headers = [
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

function csvCell(value: string | number) {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await checkAdminRole()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const dataset = await db.dataset.findUnique({
      where: { id },
      include: { cutoffs: true },
    })

    if (!dataset) return NextResponse.json({ error: "Dataset not found" }, { status: 404 })

    const rows = dataset.cutoffs.map((row) =>
      [
        row.collegeCode,
        row.collegeName,
        row.branchCode,
        row.branchName,
        row.status,
        row.homeUniversity,
        row.seatSection,
        row.stage,
        row.categoryCodeRaw,
        row.category,
        row.gender,
        row.disability,
        row.defenseQuota,
        row.closingRank,
        row.closingPercentile,
      ]
        .map(csvCell)
        .join(",")
    )

    const csv = [headers.join(","), ...rows].join("\n")
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="admitwise-${dataset.year}-${dataset.round}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error in /api/datasets/[id]/download GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
