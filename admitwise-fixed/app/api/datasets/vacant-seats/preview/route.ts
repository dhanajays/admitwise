import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"

async function checkAdminRole() {
  const allowedRoles = ["Super Admin", "Manager"]

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

  const session = (await getServerSession(authOptions)) as CustomSession | null
  if (session && session.user) {
    if (allowedRoles.includes(session.user.role)) {
      return session
    }
  }

  return null
}

export async function GET(req: Request) {
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

    const vacantSeats = await db.vacantSeat.findMany({
      where: { datasetId: id },
      take: 10,
    })

    return NextResponse.json(vacantSeats)
  } catch (error) {
    console.error("Error in /api/datasets/vacant-seats/preview GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
