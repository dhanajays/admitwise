import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
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

export async function GET(req: Request) {
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

    const cutoffs = await db.allIndiaCutoff.findMany({
      where: { datasetId: id },
      take: 10,
    })

    return NextResponse.json(cutoffs)
  } catch (error) {
    console.error("Error in /api/admin/datasets/all-india/preview GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
