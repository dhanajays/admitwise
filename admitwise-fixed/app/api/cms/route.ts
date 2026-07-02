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
      console.warn(`[Admin Auth Failure] /api/cms: Role '${adminSession.role}' for user '${adminSession.email}' is not in allowed roles:`, allowedRoles)
    }
  }

  // 2. Fallback to NextAuth session
  const session = (await getServerSession(authOptions)) as CustomSession | null
  if (session && session.user) {
    if (allowedRoles.includes(session.user.role)) {
      return session
    } else {
      console.warn(`[Admin Auth Failure] /api/cms: NextAuth Role '${session.user.role}' for user '${session.user.email}' is not in allowed roles:`, allowedRoles)
    }
  }

  if (!adminSession && !session) {
    console.warn("[Admin Auth Failure] /api/cms: No active custom admin session or NextAuth session found.")
  }

  return null
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get("key")

    if (!key) {
      return NextResponse.json({ error: "CMS key is required" }, { status: 400 })
    }

    const setting = await db.websiteSetting.findUnique({
      where: { key },
    })

    if (!setting) {
      // Return a default mock to ensure the frontend never fails to load sections
      return NextResponse.json({ key, value: null })
    }

    return NextResponse.json(setting)
  } catch (error) {
    console.error("Error in /api/cms GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { key, value } = await req.json()

    if (!key || !value) {
      return NextResponse.json({ error: "Key and Value are required" }, { status: 400 })
    }

    // Save or update setting
    const setting = await db.websiteSetting.upsert({
      where: { key },
      update: { value: typeof value === "string" ? value : JSON.stringify(value) },
      create: {
        key,
        value: typeof value === "string" ? value : JSON.stringify(value),
      },
    })

    // Log Activity
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CMS_UPDATE",
        details: `Updated website setting block: ${key}`,
      },
    })

    return NextResponse.json({ success: true, setting })
  } catch (error) {
    console.error("Error in /api/cms POST:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
