import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"

export async function getPreferenceSlotStats(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { currentPlan: true },
  })

  const currentPlan = (user?.currentPlan || "free").toLowerCase()

  // 1. Base Included Slots
  let includedSlots = 0
  let planName = "Free Plan"
  if (currentPlan === "premium") {
    includedSlots = 3
    planName = "Premium Plan (₹5000)"
  } else if (currentPlan === "elite") {
    includedSlots = 4
    planName = "Elite Plan (₹6000)"
  }

  // 2. Purchased Add-on Slots (+1 per ₹599 purchase)
  let purchasedSlots = 0
  if (db && (db as any).preferenceGeneratorPurchase) {
    try {
      const purchases = await db.preferenceGeneratorPurchase.findMany({
        where: { userId, status: "Paid" },
      })
      purchasedSlots = purchases.length
    } catch (e) {
      console.error("Error fetching preference generator purchases:", e)
    }
  }

  const totalMaxSlots = includedSlots + purchasedSlots

  // 3. Unique Saved Percentiles
  let savedPercentiles: number[] = []
  if (db && (db as any).preferenceSavedPercentile) {
    try {
      const savedRecords = await db.preferenceSavedPercentile.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      })
      savedPercentiles = savedRecords.map((r: any) => r.savedPercentile)
    } catch (e) {
      console.error("Error fetching preference saved percentiles:", e)
    }
  }

  // Fallback: If no preferenceSavedPercentile records yet, collect from purchases or predictor profiles
  if (savedPercentiles.length === 0 && purchasedSlots > 0 && db && (db as any).preferenceGeneratorPurchase) {
    try {
      const purchases = await db.preferenceGeneratorPurchase.findMany({
        where: { userId, status: "Paid" },
      })
      const pSet = new Set<number>()
      for (const p of purchases) {
        if (p.savedPercentile !== null && p.savedPercentile !== undefined) {
          pSet.add(p.savedPercentile)
        }
      }
      savedPercentiles = Array.from(pSet)
    } catch (e) {
      console.error("Error deriving saved percentiles from purchases:", e)
    }
  }

  const usedSlots = savedPercentiles.length
  const remainingSlots = Math.max(0, totalMaxSlots - usedSlots)
  const hasAccess = totalMaxSlots > 0
  const isIncludedInPlan = includedSlots > 0

  return {
    currentPlan,
    planName,
    includedSlots,
    purchasedSlots,
    totalMaxSlots,
    usedSlots,
    remainingSlots,
    hasAccess,
    isIncludedInPlan,
    savedPercentiles,
  }
}

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as CustomSession | null
    if (!session || !session.user) {
      return NextResponse.json({
        hasAccess: false,
        hasPurchased: false,
        isPaid: false,
        isIncludedInPlan: false,
        totalMaxSlots: 0,
        usedSlots: 0,
        remainingSlots: 0,
        savedPercentiles: [],
      })
    }

    const stats = await getPreferenceSlotStats(session.user.id)

    return NextResponse.json({
      hasAccess: stats.hasAccess,
      hasPurchased: stats.hasAccess,
      isPaid: stats.hasAccess,
      isIncludedInPlan: stats.isIncludedInPlan,
      planName: stats.planName,
      includedSlots: stats.includedSlots,
      purchasedSlots: stats.purchasedSlots,
      totalMaxSlots: stats.totalMaxSlots,
      usedSlots: stats.usedSlots,
      remainingSlots: stats.remainingSlots,
      savedPercentiles: stats.savedPercentiles,
    })
  } catch (error) {
    console.error("Error in /api/preference-generator/purchase GET:", error)
    return NextResponse.json({
      hasAccess: false,
      hasPurchased: false,
      isPaid: false,
      isIncludedInPlan: false,
      totalMaxSlots: 0,
      usedSlots: 0,
      remainingSlots: 0,
      savedPercentiles: [],
    })
  }
}
