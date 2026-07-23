import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getPreferenceListEntitlement } from "@/lib/payments"
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
    const userId = session?.user?.id

    // 1. Calculate entitlement ONCE into a single object
    const entitlement = await getPreferenceListEntitlement(userId, round, percentile)

    // 2. mode === "blocked": CAP Round is purchased BUT percentile is not saved
    if (entitlement.mode === "blocked") {
      return NextResponse.json(
        {
          success: false,
          mode: "blocked",
          error: entitlement.message,
          items: [],
          totalCount: 0,
          entitlement,
        },
        { status: 400 }
      )
    }

    // 3. mode === "preview": CAP Round is NOT purchased
    if (entitlement.mode === "preview") {
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
        5
      )

      const items = (previewResult.items || []).slice(0, 5)

      return NextResponse.json({
        success: true,
        mode: "preview",
        totalCount: previewResult.items?.length || items.length,
        previewCount: items.length,
        items,
        entitlement,
      })
    }

    // 4. mode === "full": CAP Round IS purchased AND percentile IS saved
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
      mode: "full",
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
