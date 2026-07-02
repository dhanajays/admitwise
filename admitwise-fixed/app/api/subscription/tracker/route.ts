import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as CustomSession
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.loginProvider === "google" && session.user.isFirstGoogleSignup === true) {
      return NextResponse.json(
        { error: "Please complete your profile by providing a phone number first.", code: "PROFILE_INCOMPLETE" },
        { status: 403 }
      )
    }

    let userId = session.user.id
    const { exam, round, category } = await req.json()

    if (!exam || !round || !category) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    // Check user and plan limits
    let user = await db.user.findUnique({
      where: { id: userId },
      include: { trackerCategoryProfiles: true },
    })

    if (!user && session.user.email) {
      user = await db.user.findUnique({
        where: { email: session.user.email },
        include: { trackerCategoryProfiles: true },
      })
      if (user) {
        userId = user.id
      }
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Find active base subscriptions
    const activeSubs = await db.subscription.findMany({
      where: { userId, status: "active" }
    })

    const planTiers: Record<string, number> = {
      free: 0,
      single: 1,
      multi_round: 2,
      premium: 3,
      elite: 4,
    }

    let basePlan = "free"
    let highestSub = activeSubs[0] || null

    for (const sub of activeSubs) {
      const subTier = planTiers[sub.planId] || 0
      const highestTier = planTiers[basePlan] || 0
      if (subTier > highestTier) {
        basePlan = sub.planId
        highestSub = sub
      }
    }

    // Check if tracker profile already exists
    const existing = user.trackerCategoryProfiles.find((p) => {
      if (basePlan === "single") {
        return p.exam === exam && p.round === round && p.category.toUpperCase() === category.toUpperCase()
      } else {
        return p.exam === exam && p.category.toUpperCase() === category.toUpperCase()
      }
    })

    if (existing) {
      return NextResponse.json({
        message: "Tracker profile already exists",
        profile: {
          id: existing.id,
          exam: existing.exam,
          round: existing.round,
          category: existing.category,
          createdAt: existing.createdAt.toISOString(),
        },
      })
    }

    let baseLimit = 0
    if (basePlan === "single") {
      baseLimit = activeSubs
        .filter((s) => s.planId === "single")
        .reduce((sum, s) => sum + s.trackerMaxProfiles, 0)
    } else {
      baseLimit = highestSub ? highestSub.trackerMaxProfiles : 0
    }

    const trackerLimit = user.trackerProfileLimit

    // Enforce limits
    if (basePlan === "single") {
      if (user.trackerCategoryProfiles.length >= trackerLimit) {
        return NextResponse.json({ error: "Tracker category profile limit reached", code: "LIMIT_REACHED" }, { status: 400 })
      }
    } else {
      const uniqueCategories = Array.from(new Set(user.trackerCategoryProfiles.map((p) => p.category.toUpperCase())))
      if (!uniqueCategories.includes(category.toUpperCase())) {
        if (uniqueCategories.length >= trackerLimit) {
          return NextResponse.json({ error: "Tracker category profile limit reached", code: "LIMIT_REACHED" }, { status: 400 })
        }
      }
    }

    let profilePlanId = user.currentPlan
    if (basePlan === "single") {
      const singleSubs = await db.subscription.findMany({
        where: { userId, planId: "single", status: "active" },
        orderBy: { activatedAt: "asc" }
      })
      const index = user.trackerCategoryProfiles.length
      if (index < singleSubs.length) {
        profilePlanId = singleSubs[index].id
      } else if (singleSubs.length > 0) {
        profilePlanId = singleSubs[singleSubs.length - 1].id
      }
    }

    // Create the tracker profile
    const profile = await db.trackerCategoryProfile.create({
      data: {
        userId,
        exam,
        round,
        category,
        planId: profilePlanId,
        isLocked: true,
        usageCount: 1,
      },
    })

    // Update trackerProfilesUsed counter in user table
    await db.user.update({
      where: { id: userId },
      data: {
        trackerProfilesUsed: {
          increment: 1,
        },
      },
    })

    // Log Activity
    await db.activityLog.create({
      data: {
        userId,
        action: "TRACKER_PROFILE_ADD",
        details: `Saved tracker profile for ${exam} Round ${round} Category ${category}`,
      },
    })

    return NextResponse.json({
      message: "Tracker profile added successfully",
      profile: {
        id: profile.id,
        exam: profile.exam,
        round: profile.round,
        category: profile.category,
        createdAt: profile.createdAt.toISOString(),
        planId: profile.planId,
        isLocked: profile.isLocked,
        usageCount: profile.usageCount,
      },
    })
  } catch (error) {
    console.error("Error in /api/subscription/tracker POST:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
