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
    let isPaid = false
    let entitlement: EntitlementResult | null = null

    if (session && session.user) {
      try {
        entitlement = await evaluatePreferenceListAccess(session.user.id, round, percentile)
        isPaid = entitlement.hasAccess && !entitlement.previewOnly

        // If round IS purchased and entered percentile is new, save it permanently
        if (entitlement.hasAccess && !entitlement.previewOnly) {
          const isAlreadySaved = entitlement.savedPercentiles.some((sp) => Math.abs(sp - percentile) < 0.001)
          if (!isAlreadySaved && db && (db as any).preferenceSavedPercentile) {
            try {
              await db.preferenceSavedPercentile.upsert({
                where: { userId_savedPercentile: { userId: session.user.id, savedPercentile: percentile } },
                create: { userId: session.user.id, savedPercentile: percentile },
                update: {},
              })
            } catch (saveErr) {
              console.warn("Could not save to preferenceSavedPercentile:", saveErr)
            }
          }
        }
      } catch (e) {
        console.error("Error evaluating central preference entitlement in generate API:", e)
        isPaid = false
      }
    }

    const result = await PreferenceGeneratorService.generatePreferenceList({
      percentile,
      round,
      preferredBranches,
      preferredCities,
      category,
      gender,
      pwd,
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
      isIncludedInPlan: entitlement?.isFullPlan || false,
      totalCount,
      previewCount,
      items,
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
