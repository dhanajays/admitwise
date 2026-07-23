import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { evaluatePreferenceListAccess, EntitlementResult } from "@/lib/payments"
import { PreferenceGeneratorService } from "@/lib/preference-generator/service"
import { z } from "zod"

const generateSchema = z.object({
  percentile: z.number().min(0).max(100),
  round: z.string(),
  preferredBranches: z.array(z.string()).min(1, "Select at least one branch"),
  preferredCities: z.array(z.string()).min(1, "Select at least one city"),
  category: z.string().optional().default("OPEN"),
  gender: z.string().optional().default("Male"),
  pwd: z.string().optional().default("No"),
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

    let { percentile, round, preferredBranches, preferredCities, category, gender, pwd } = parsed.data

    const session = (await getServerSession(authOptions)) as CustomSession | null

    // STEP 1: Entitlement decision BEFORE generating preference list
    let entitlement: EntitlementResult | null = null
    let statusState: "UNPAID_ROUND" | "PAID_ROUND_SAVED_PERCENTILE" | "PAID_ROUND_UNSAVED_PERCENTILE" = "UNPAID_ROUND"

    if (session && session.user) {
      try {
        entitlement = await evaluatePreferenceListAccess(session.user.id, round, percentile)
        statusState = entitlement.statusState
      } catch (e) {
        console.error("Error evaluating central preference entitlement in generate API:", e)
        statusState = "UNPAID_ROUND"
      }
    }

    // DECISION 1: CAP Round IS purchased BUT percentile is NOT saved (Rule 6)
    if (statusState === "PAID_ROUND_UNSAVED_PERCENTILE") {
      return NextResponse.json(
        {
          success: false,
          error: entitlement?.message || "You don't have this percentile saved. Purchase +1 Saved Percentile (₹599) to use this percentile.",
          isBlockedPercentile: true,
          entitlement,
        },
        { status: 400 }
      )
    }

    // DECISION 2: CAP Round is NOT purchased (Rule 2, 7 & 9) -> UNPAID_ROUND
    if (statusState === "UNPAID_ROUND") {
      // Backend returns ONLY preview data (first 5 colleges)
      const previewResult = await PreferenceGeneratorService.generatePreferenceList(
        {
          percentile,
          round,
          preferredBranches,
          preferredCities,
          category,
          gender,
          pwd,
        },
        5 // Pass limit = 5 to ensure backend ONLY processes and returns top 5 preview items
      )

      const items = (previewResult.items || []).slice(0, 5)

      return NextResponse.json({
        success: true,
        isPaid: false,
        isPreview: true,
        isIncludedInPlan: false,
        totalCount: previewResult.items?.length || items.length,
        previewCount: items.length,
        items,
        entitlement,
      })
    }

    // DECISION 3: CAP Round IS purchased AND percentile IS saved (Rule 3, 4, 5) -> PAID_ROUND_SAVED_PERCENTILE
    const fullResult = await PreferenceGeneratorService.generatePreferenceList({
      percentile,
      round,
      preferredBranches,
      preferredCities,
      category,
      gender,
      pwd,
    })

    if (fullResult.error) {
      return NextResponse.json(
        { success: false, error: fullResult.error },
        { status: 400 }
      )
    }

    const allItems = fullResult.items || []

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
              collegesGenerated: allItems.length,
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
      isPaid: true,
      isPreview: false,
      isIncludedInPlan: entitlement?.isFullPlan || false,
      totalCount: allItems.length,
      previewCount: allItems.length,
      items: allItems,
      entitlement,
    })
  } catch (error: any) {
    console.error("Error in /api/preference-generator/generate POST:", error)
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
