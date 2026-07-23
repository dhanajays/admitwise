import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as CustomSession | null
    if (!session || !session.user) {
      return NextResponse.json({ hasPurchased: false, isPaid: false, purchase: null })
    }

    const { searchParams } = new URL(req.url)
    const round = searchParams.get("round") || "Round 1"

    // 1. Check if user owns Premium (₹5000) or Elite (₹6000) plan which includes full Preference List Generator access
    try {
      const userRecord = await db.user.findUnique({
        where: { id: session.user.id },
        select: { currentPlan: true },
      })

      if (userRecord && (userRecord.currentPlan === "premium" || userRecord.currentPlan === "elite")) {
        return NextResponse.json({
          hasPurchased: true,
          isPaid: true,
          isIncludedInPlan: true,
          planName: userRecord.currentPlan === "premium" ? "Included in ₹5000 Plan" : "Included in ₹6000 Plan",
          purchase: null,
        })
      }
    } catch (userPlanErr) {
      console.error("Error looking up user plan for preference access check:", userPlanErr)
    }

    // 2. Check individual ₹599 PreferenceGeneratorPurchase records
    let purchase = null
    let allPurchases: any[] = []
    if (db && (db as any).preferenceGeneratorPurchase) {
      try {
        const records = await db.preferenceGeneratorPurchase.findMany({
          where: {
            userId: session.user.id,
            status: "Paid",
          },
        })
        allPurchases = records.map((r: any) => ({
          round: r.round,
          savedPercentile: r.savedPercentile,
          createdAt: r.createdAt.toISOString(),
        }))
        purchase = records.find((r: any) => r.round === round) || null
      } catch (e) {
        console.error("Error looking up purchase records:", e)
      }
    }

    if (purchase && purchase.status === "Paid") {
      return NextResponse.json({
        hasPurchased: true,
        isPaid: true,
        isIncludedInPlan: false,
        purchase: {
          id: purchase.id,
          round: purchase.round,
          savedPercentile: purchase.savedPercentile,
          createdAt: purchase.createdAt.toISOString(),
        },
        allPurchases,
      })
    }

    return NextResponse.json({
      hasPurchased: false,
      isPaid: false,
      isIncludedInPlan: false,
      purchase: null,
      allPurchases,
    })
  } catch (error) {
    console.error("Error in /api/preference-generator/purchase GET:", error)
    return NextResponse.json({ hasPurchased: false, isPaid: false, purchase: null })
  }
}
