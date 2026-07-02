import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { calculateUnifiedStats } from "@/lib/subscription/limits"

export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as CustomSession
    if (!session || !session.user) {
      return NextResponse.json({
        plan: "free",
        maxProfiles: 0,
        profiles: [],
        purchasedAddOns: 0,
        activatedAt: "",
      })
    }

    const userId = session.user.id

    let user = await db.user.findUnique({
      where: { id: userId },
      include: {
        predictionProfiles: true,
        trackerCategoryProfiles: true,
        subscriptions: {
          where: { status: "active" },
          orderBy: { activatedAt: "desc" },
        },
      },
    })

    if (!user && session.user.email) {
      user = await db.user.findUnique({
        where: { email: session.user.email },
        include: {
          predictionProfiles: true,
          trackerCategoryProfiles: true,
          subscriptions: {
            where: { status: "active" },
            orderBy: { activatedAt: "desc" },
          },
        },
      })
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const planTiers: Record<string, number> = {
      free: 0,
      single: 1,
      multi_round: 2,
      premium: 3,
      elite: 4,
    }

    let activeSub = user.subscriptions[0] || null
    let basePlan = "free"
    let baseLimit = 0

    // Find highest active plan tier
    for (const sub of user.subscriptions) {
      const subTier = planTiers[sub.planId] || 0
      const highestTier = planTiers[basePlan] || 0
      if (subTier > highestTier) {
        basePlan = sub.planId
        activeSub = sub
      }
    }

    if (basePlan === "single") {
      // Sum limits of all active Single Predictor purchases
      baseLimit = user.subscriptions
        .filter((s) => s.planId === "single")
        .reduce((sum, s) => sum + s.maxProfiles, 0)
    } else {
      baseLimit = activeSub ? activeSub.maxProfiles : 0
    }

    // Fetch successful add-on payments directly from database
    const addonPayments = await db.payment.findMany({
      where: { userId: user.id, purchaseType: "addon", status: "Success" }
    })
    const addonsCount = addonPayments.reduce((sum, p) => sum + (p.addonQuantity || 1), 0)

    const targetPredictor = baseLimit + addonsCount
    const targetTracker = baseLimit + addonsCount

    if (
      user.currentPlan !== basePlan ||
      user.purchasedAddons !== addonsCount ||
      user.profileLimit < targetPredictor ||
      user.trackerProfileLimit < targetTracker
    ) {
      const updatedUser = await db.user.update({
        where: { id: user.id },
        data: {
          currentPlan: basePlan,
          purchasedAddons: addonsCount,
          profileLimit: Math.max(user.profileLimit, targetPredictor),
          trackerProfileLimit: Math.max(user.trackerProfileLimit, targetTracker),
        },
      })
      user.profileLimit = updatedUser.profileLimit
      user.trackerProfileLimit = updatedUser.trackerProfileLimit
    }

    let predictorLimit = user.profileLimit
    let trackerLimit = user.trackerProfileLimit

    const profiles = user.predictionProfiles.map((p) => ({
      id: p.id,
      exam: p.exam,
      percentile: p.percentile,
      predictionType: p.predictionType || "mht-cet",
      examScores: p.examScores || null,
      round: p.round || "I",
      gender: p.gender || "Male",
      category: p.category || "OPEN",
      homeUniversity: p.homeUniversity || "",
      disability: p.disability || false,
      defenseQuota: p.defenseQuota || false,
      preferredBranches: p.preferredBranches ? JSON.parse(p.preferredBranches) : [],
      createdAt: p.createdAt.toISOString(),
      planId: p.planId || user.currentPlan,
      isLocked: p.isLocked,
      usageCount: p.usageCount,
    }))

    const trackerProfiles = user.trackerCategoryProfiles.map((p) => ({
      id: p.id,
      exam: p.exam,
      round: p.round,
      category: p.category,
      createdAt: p.createdAt.toISOString(),
      planId: p.planId || user.currentPlan,
      isLocked: p.isLocked,
      usageCount: p.usageCount,
    }))

    // Calculate addons purchased from database sync

    const stats = calculateUnifiedStats(
      user.currentPlan,
      predictorLimit,
      trackerLimit,
      profiles,
      trackerProfiles
    )

    const singlePurchases = user.subscriptions
      .filter((s) => s.planId === "single")
      .map((s) => ({
        id: s.id,
        selectedRound: s.selectedRound,
        isUsed: s.isUsed,
        trackerSelectedRound: s.trackerSelectedRound,
        trackerIsUsed: s.trackerIsUsed,
      }))

    return NextResponse.json({
      plan: user.currentPlan || "free",
      maxProfiles: predictorLimit,
      profiles,
      trackerMaxProfiles: trackerLimit,
      trackerProfiles,
      purchasedAddOns: addonsCount,
      trackerPurchasedAddOns: 0,
      activatedAt: activeSub ? activeSub.activatedAt.toISOString() : "",
      stats,
      singlePurchases,
    })
  } catch (error) {
    console.error("Error in /api/subscription GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

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
    const {
      exam,
      percentile,
      predictionType,
      examScores,
      round,
      gender,
      category,
      homeUniversity,
      disability,
      defenseQuota,
      preferredBranches,
    } = await req.json()

    if (!exam || percentile === undefined) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    // Check user and plan limits
    let user = await db.user.findUnique({
      where: { id: userId },
      include: { predictionProfiles: true },
    })

    if (!user && session.user.email) {
      user = await db.user.findUnique({
        where: { email: session.user.email },
        include: { predictionProfiles: true },
      })
      if (user) {
        userId = user.id
      }
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const pB = preferredBranches ? JSON.stringify(preferredBranches) : null

    // Check if profile already exists
    const existing = user.predictionProfiles.find((p) => {
      if (predictionType === "all-india") {
        return p.predictionType === "all-india" &&
               p.examScores === examScores &&
               (p.round || "I") === (round || "I") &&
               (p.gender || "Male") === (gender || "Male") &&
               (p.category || "OPEN") === (category || "OPEN") &&
               (p.homeUniversity || "") === (homeUniversity || "") &&
               (p.disability || false) === (disability || false) &&
               (p.defenseQuota || false) === (defenseQuota || false) &&
               p.preferredBranches === pB
      }
      return p.predictionType !== "all-india" &&
             p.exam === exam &&
             Math.abs(p.percentile - percentile) < 0.00001 &&
             (p.round || "I") === (round || "I") &&
             (p.gender || "Male") === (gender || "Male") &&
             (p.category || "OPEN") === (category || "OPEN") &&
             (p.homeUniversity || "") === (homeUniversity || "") &&
             (p.disability || false) === (disability || false) &&
             (p.defenseQuota || false) === (defenseQuota || false) &&
             p.preferredBranches === pB
    })

    if (existing) {
      return NextResponse.json({
        message: "Profile already exists",
        profile: {
          id: existing.id,
          exam: existing.exam,
          percentile: existing.percentile,
          predictionType: existing.predictionType || "mht-cet",
          examScores: existing.examScores || null,
          round: existing.round || "I",
          gender: existing.gender || "Male",
          category: existing.category || "OPEN",
          homeUniversity: existing.homeUniversity || "",
          disability: existing.disability || false,
          defenseQuota: existing.defenseQuota || false,
          preferredBranches: existing.preferredBranches ? JSON.parse(existing.preferredBranches) : [],
          createdAt: existing.createdAt.toISOString(),
          planId: existing.planId || user.currentPlan,
          isLocked: existing.isLocked,
          usageCount: existing.usageCount,
        },
      })
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

    let baseLimit = 0
    if (basePlan === "single") {
      baseLimit = activeSubs
        .filter((s) => s.planId === "single")
        .reduce((sum, s) => sum + s.maxProfiles, 0)
    } else {
      baseLimit = highestSub ? highestSub.maxProfiles : 0
    }

    const totalLimit = user.profileLimit

    // Calculate current unified stats
    const stats = calculateUnifiedStats(
      basePlan,
      totalLimit,
      totalLimit,
      user.predictionProfiles,
      []
    )

    // Enforce category-specific limits
    if (exam === "JEE(Main)") {
      if (stats.jeeMain.remaining <= 0) {
        return NextResponse.json({ error: "JEE(Main) profile limit reached", code: "LIMIT_REACHED" }, { status: 400 })
      }
    } else if (exam === "NEET") {
      if (stats.neet.remaining <= 0) {
        return NextResponse.json({ error: "NEET profile limit reached", code: "LIMIT_REACHED" }, { status: 400 })
      }
    } else {
      // MHT-CET or other PCM/PCB exams
      if (stats.mhtCet.remaining <= 0) {
        return NextResponse.json({ error: "MHT CET profile limit reached", code: "LIMIT_REACHED" }, { status: 400 })
      }
    }

    let profilePlanId = user.currentPlan
    if (basePlan === "single") {
      const singleSubs = await db.subscription.findMany({
        where: { userId, planId: "single", status: "active" },
        orderBy: { activatedAt: "asc" }
      })
      const index = user.predictionProfiles.length
      if (index < singleSubs.length) {
        profilePlanId = singleSubs[index].id
      } else if (singleSubs.length > 0) {
        profilePlanId = singleSubs[singleSubs.length - 1].id
      }
    }

    // Create the profile
    const profile = await db.predictionProfile.create({
      data: {
        userId,
        exam,
        percentile,
        predictionType: predictionType || "mht-cet",
        examScores: examScores || null,
        round: round || "I",
        gender: gender || "Male",
        category: category || "OPEN",
        homeUniversity: homeUniversity || null,
        disability: disability || false,
        defenseQuota: defenseQuota || false,
        preferredBranches: pB,
        planId: profilePlanId,
        isLocked: true,
        usageCount: 1,
      },
    })

    // Update profilesUsed counter in user table
    await db.user.update({
      where: { id: userId },
      data: {
        profilesUsed: {
          increment: 1,
        },
      },
    })

    // Log Activity
    await db.activityLog.create({
      data: {
        userId,
        action: "PROFILE_ADD",
        details: `Saved profile for ${exam} with ${percentile} percentile (Type: ${predictionType || "mht-cet"})`,
      },
    })

    return NextResponse.json({
      message: "Profile added successfully",
      profile: {
        id: profile.id,
        exam: profile.exam,
        percentile: profile.percentile,
        predictionType: profile.predictionType || "mht-cet",
        examScores: profile.examScores || null,
        round: profile.round || "I",
        gender: profile.gender || "Male",
        category: profile.category || "OPEN",
        homeUniversity: profile.homeUniversity || "",
        disability: profile.disability || false,
        defenseQuota: profile.defenseQuota || false,
        preferredBranches: profile.preferredBranches ? JSON.parse(profile.preferredBranches) : [],
        createdAt: profile.createdAt.toISOString(),
        planId: profile.planId,
        isLocked: profile.isLocked,
        usageCount: profile.usageCount,
      },
    })
  } catch (error) {
    console.error("Error in /api/subscription POST:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

