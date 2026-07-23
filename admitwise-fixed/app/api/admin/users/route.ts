import { getAdminSession } from "@/lib/admin-auth"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import * as bcrypt from "bcryptjs"

async function checkAdminRole() {
  const session = await getAdminSession()
  if (!session) return null
  const allowedRoles = ["Super Admin", "Manager", "Support Executive", "Counsellor"]
  if (!allowedRoles.includes(session.role)) return null
  return session
}

export async function GET(req: Request) {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    // If userId specified, return their full details + prediction history
    if (userId) {
      let student: any = null
      try {
        student = await db.user.findUnique({
          where: { id: userId },
          include: {
            predictionProfiles: true,
            predictionHistories: {
              orderBy: { createdAt: "desc" },
            },
            payments: {
              orderBy: { createdAt: "desc" },
            },
            preferenceGeneratorPurchases: {
              orderBy: { createdAt: "desc" },
            },
            preferenceGeneratorHistories: {
              orderBy: { createdAt: "desc" },
            },
          },
        })
      } catch (detailErr: any) {
        console.error("[admin/users GET] findUnique fallback triggered:", detailErr.message)
        student = await db.user.findUnique({
          where: { id: userId },
          include: {
            predictionProfiles: true,
            predictionHistories: {
              orderBy: { createdAt: "desc" },
            },
            payments: {
              orderBy: { createdAt: "desc" },
            },
          },
        })
      }

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }

      return NextResponse.json(student)
    }

    // Otherwise list all students
    let students: any[] = []
    try {
      students = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          role: true,
          predictionProfiles: true,
          preferenceGeneratorPurchases: true,
        },
      })
    } catch (queryErr: any) {
      console.error("[admin/users GET] findMany fallback triggered:", queryErr.message)
      students = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          role: true,
          predictionProfiles: true,
        },
      })
    }

    const formatted = students.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      loginProvider: u.loginProvider,
      currentPlan: u.currentPlan,
      paymentStatus: u.paymentStatus,
      profileLimit: u.profileLimit,
      profilesUsed: u.profilesUsed,
      isSuspended: u.isSuspended,
      role: u.role?.name || "Student",
      hasPreferenceAccess:
        u.currentPlan === "premium" ||
        u.currentPlan === "elite" ||
        (Array.isArray(u.preferenceGeneratorPurchases) &&
          u.preferenceGeneratorPurchases.some((p: any) => p.status === "Paid")),
      preferencePurchases: Array.isArray(u.preferenceGeneratorPurchases)
        ? u.preferenceGeneratorPurchases.filter((p: any) => p.status === "Paid")
        : [],
    }))

    return NextResponse.json(formatted)
  } catch (error: any) {
    console.error("[admin/users GET] Error fetching users:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}


export async function POST(req: Request) {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, userId, planId, limit, isSuspended, password } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // ── 1. Suspend / Activate User ───────────────────────────────────────────
    if (action === "toggle_suspension") {
      if (isSuspended === undefined) {
        return NextResponse.json({ error: "Suspension state required" }, { status: 400 })
      }

      await db.user.update({
        where: { id: userId },
        data: { isSuspended },
      })

      await db.activityLog.create({
        data: {
          userId: session.userId,
          action: isSuspended ? "USER_SUSPEND" : "USER_ACTIVATE",
          details: `${isSuspended ? "Suspended" : "Activated"} user ${user.email}`,
        },
      })

      return NextResponse.json({ success: true, message: `User suspension toggled to ${isSuspended}` })
    }

    // ── 2. Upgrade User Plan ─────────────────────────────────────────────────
    if (action === "upgrade_plan") {
      if (!planId) {
        return NextResponse.json({ error: "Plan ID is required" }, { status: 400 })
      }

      const plan = await db.plan.findUnique({ where: { id: planId } })
      if (!plan) {
        return NextResponse.json({ error: "Invalid Plan ID" }, { status: 400 })
      }

      await db.user.update({
        where: { id: userId },
        data: {
          currentPlan: planId,
          profileLimit: plan.maxProfiles + user.purchasedAddons,
          trackerProfileLimit: plan.maxProfiles + user.purchasedAddons,
          paymentStatus: "paid",
        },
      })

      // Expire previous active subscriptions
      await db.subscription.updateMany({
        where: { userId, status: "active" },
        data: { status: "expired", expiresAt: new Date() },
      })

      // Add subscription entry
      await db.subscription.create({
        data: {
          userId,
          planId,
          maxProfiles: plan.maxProfiles,
          trackerMaxProfiles: plan.maxProfiles,
          status: "active",
        },
      })

      await db.activityLog.create({
        data: {
          userId: session.userId,
          action: "ADMIN_USER_UPGRADE",
          details: `Manually upgraded user ${user.email} to plan ${planId}`,
        },
      })

      return NextResponse.json({ success: true, message: `User upgraded to ${plan.name}` })
    }

    // ── 3. Increase Percentile Profile Limit ─────────────────────────────────
    if (action === "change_limit") {
      if (limit === undefined || typeof limit !== "number") {
        return NextResponse.json({ error: "Valid limit is required" }, { status: 400 })
      }

      await db.user.update({
        where: { id: userId },
        data: {
          profileLimit: limit,
          trackerProfileLimit: limit,
        },
      })

      await db.activityLog.create({
        data: {
          userId: session.userId,
          action: "ADMIN_LIMIT_CHANGE",
          details: `Changed profile limit of user ${user.email} to ${limit}`,
        },
      })

      return NextResponse.json({ success: true, message: `Profile limit set to ${limit}` })
    }

    // ── 4. Reset User Password ───────────────────────────────────────────────
    if (action === "reset_password") {
      if (!password || password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
      }

      const passwordHash = await bcrypt.hash(password, 10)
      await db.user.update({
        where: { id: userId },
        data: { passwordHash },
      })

      await db.activityLog.create({
        data: {
          userId: session.userId,
          action: "ADMIN_PASSWORD_RESET",
          details: `Reset password of user ${user.email}`,
        },
      })

      return NextResponse.json({ success: true, message: "Password reset successfully" })
    }

    // ── 5. Grant / Revoke Preference List Generator Access ───────────────────
    if (action === "grant_preference_access") {
      const { round = "Round 1", accessStatus = "Active", percentile = 95 } = body

      if (accessStatus === "No Access" || accessStatus === "Expired") {
        await db.preferenceGeneratorPurchase.updateMany({
          where: { userId, round },
          data: { status: "Expired" },
        })
        return NextResponse.json({ success: true, message: `Preference list access revoked for ${round}` })
      }

      await db.preferenceGeneratorPurchase.upsert({
        where: {
          userId_round: {
            userId,
            round,
          },
        },
        update: {
          status: "Paid",
          savedPercentile: percentile,
          amount: 599,
          paymentId: "admin_manual",
        },
        create: {
          userId,
          round,
          savedPercentile: percentile,
          status: "Paid",
          amount: 599,
          paymentId: "admin_manual",
        },
      })

      await db.activityLog.create({
        data: {
          userId: session.userId,
          action: "ADMIN_PREFERENCE_GRANT",
          details: `Manually granted Preference List Generator access to user ${user.email} for ${round}`,
        },
      })

      return NextResponse.json({ success: true, message: `Granted Preference List access for ${round}` })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in /api/admin/users POST:", error)
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
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    await db.user.delete({ where: { id: userId } })

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "USER_DELETE",
        details: `Deleted user account: ${user.email}`,
      },
    })

    return NextResponse.json({ success: true, message: "User deleted successfully" })
  } catch (error) {
    console.error("Error in /api/admin/users DELETE:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
