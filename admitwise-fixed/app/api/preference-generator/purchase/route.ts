import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { getPreferenceListAccess } from "@/lib/payments"

export async function getPreferenceSlotStats(userId: string) {
  const access = await getPreferenceListAccess(userId)
  return {
    currentPlan: access.currentPlan,
    planName: access.planName,
    includedSlots: access.includedSlots,
    purchasedSlots: access.purchasedSlots,
    totalMaxSlots: access.totalMaxSlots,
    usedSlots: access.usedSlots,
    remainingSlots: access.remainingSlots,
    hasAccess: access.hasAccess,
    isIncludedInPlan: access.isFullPlan,
    allowedRounds: access.allowedRounds,
    savedPercentiles: access.savedPercentiles,
    purchases: access.purchases,
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
