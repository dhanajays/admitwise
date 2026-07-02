import { getAdminSession } from "@/lib/admin-auth"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

async function checkAdminRole() {
  const session = await getAdminSession()
  if (!session) return null
  const allowedRoles = ["Super Admin", "Manager", "Support Executive"]
  if (!allowedRoles.includes(session.role)) return null
  return session
}

export async function GET() {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const logs = await db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error("Error in /api/admin/logs GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
