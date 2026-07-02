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
      console.warn(`[Admin Auth Failure] /api/plans: Role '${adminSession.role}' for user '${adminSession.email}' is not in allowed roles:`, allowedRoles)
    }
  }

  // 2. Fallback to NextAuth session
  const session = (await getServerSession(authOptions)) as CustomSession | null
  if (session && session.user) {
    if (allowedRoles.includes(session.user.role)) {
      return session
    } else {
      console.warn(`[Admin Auth Failure] /api/plans: NextAuth Role '${session.user.role}' for user '${session.user.email}' is not in allowed roles:`, allowedRoles)
    }
  }

  if (!adminSession && !session) {
    console.warn("[Admin Auth Failure] /api/plans: No active custom admin session or NextAuth session found.")
  }

  return null
}

export async function GET() {
  try {
    const plans = await db.plan.findMany({
      where: { isEnabled: true },
      orderBy: { price: "asc" },
    })

    // Map features back to arrays
    const formatted = plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      description: p.description,
      maxProfiles: p.maxProfiles,
      features: JSON.parse(p.features),
      isEnabled: p.isEnabled,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error in /api/plans GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, name, price, description, maxProfiles, features, isEnabled } = await req.json()

    if (!id || !name || price === undefined || !description || maxProfiles === undefined || !features) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const featuresStr = typeof features === "string" ? features : JSON.stringify(features)

    const plan = await db.plan.upsert({
      where: { id },
      update: {
        name,
        price: parseFloat(price),
        description,
        maxProfiles: parseInt(maxProfiles, 10),
        features: featuresStr,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      },
      create: {
        id,
        name,
        price: parseFloat(price),
        description,
        maxProfiles: parseInt(maxProfiles, 10),
        features: featuresStr,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      },
    })

    // Log Activity
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "PLAN_UPSERT",
        details: `Created/Updated plan ${name} (ID: ${id}) with price ₹${price}`,
      },
    })

    return NextResponse.json({ success: true, plan })
  } catch (error) {
    console.error("Error in /api/plans POST:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
