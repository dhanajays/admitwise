import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { PreferenceGeneratorService } from "@/lib/preference-generator/service"
import { getPreferenceSlotStats } from "../purchase/route"
import { z } from "zod"

const generateSchema = z.object({
  percentile: z.number().min(0).max(100),
  round: z.string(),
  preferredBranches: z.array(z.string()).min(1, "Select at least one branch"),
  preferredCities: z.array(z.string()).min(1, "Select at least one city"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = generateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation Error", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    let { percentile, round, preferredBranches, preferredCities } = parsed.data

    const session = (await getServerSession(authOptions)) as CustomSession | null
    let isPaid = false
    let isIncludedInPlan = false
    let savedPercentile: number | undefined = undefined
    let lockedPercentileMismatch = false

    if (session && session.user) {
      try {
        const slotStats = await getPreferenceSlotStats(session.user.id)
        isIncludedInPlan = slotStats.isIncludedInPlan

        // Check if percentile matches an existing saved percentile profile (within 0.001 precision):
        const existingPercentile = slotStats.savedPercentiles.find(
          (sp) => Math.abs(sp - percentile) < 0.001
        )

        if (existingPercentile !== undefined) {
          // Reusing existing Saved Percentile Profile -> Unlimited generations across ALL CAP rounds!
          isPaid = true
          percentile = existingPercentile
          savedPercentile = existingPercentile
        } else {
          // New Percentile Profile
          if (slotStats.usedSlots < slotStats.totalMaxSlots) {
            // Save new percentile profile slot
            if (db && (db as any).preferenceSavedPercentile) {
              try {
                await db.preferenceSavedPercentile.create({
                  data: {
                    userId: session.user.id,
                    savedPercentile: percentile,
                  },
                })
              } catch (saveErr) {
                console.warn("Could not save to preferenceSavedPercentile:", saveErr)
              }
            }
            isPaid = true
            savedPercentile = percentile
          } else {
            // Slots Exhausted! Block creation of new percentile.
            isPaid = false
            const planText = slotStats.currentPlan === "premium" ? "your Premium Plan" : slotStats.currentPlan === "elite" ? "your Elite Plan" : "your account"
            return NextResponse.json(
              {
                success: false,
                isPaid: false,
                isIncludedInPlan,
                slotLimitExhausted: true,
                error: `You have used all ${slotStats.totalMaxSlots} saved percentile slots included in ${planText}. Purchase +1 Saved Percentile (₹599) to continue.`,
                slotStats,
              },
              { status: 403 }
            )
          }
        }
      } catch (e) {
        console.error("Error evaluating preference slot stats in generate API:", e)
        isPaid = false
      }
    }

    const result = await PreferenceGeneratorService.generatePreferenceList({
      percentile,
      round,
      preferredBranches,
      preferredCities,
    })

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    const allItems = result.items || []
    const totalCount = allItems.length
    const previewCount = isPaid ? totalCount : Math.min(5, totalCount)
    const items = isPaid ? allItems : allItems.slice(0, 5)

    // Save Generation History for authenticated student
    if (session && session.user && session.user.id) {
      try {
        if (db && (db as any).preferenceGeneratorHistory) {
          await db.preferenceGeneratorHistory.create({
            data: {
              userId: session.user.id,
              percentile,
              round,
              preferredBranches: JSON.stringify(preferredBranches),
              preferredCities: JSON.stringify(preferredCities),
              collegesGenerated: totalCount,
              downloadedPdf: false,
            },
          })
        }
      } catch (histErr) {
        console.error("Failed to record preference generation history:", histErr)
      }
    }

    return NextResponse.json({
      success: true,
      isPaid,
      isIncludedInPlan,
      savedPercentile,
      lockedPercentileMismatch,
      totalCount,
      previewCount,
      items,
    })
  } catch (error: any) {
    console.error("Error in /api/preference-generator/generate POST:", error)
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
