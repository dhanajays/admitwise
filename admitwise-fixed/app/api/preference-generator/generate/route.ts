import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { PreferenceGeneratorService } from "@/lib/preference-generator/service"
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
    let savedPercentile: number | undefined = undefined

    if (session && session.user) {
      const purchase = await db.preferenceGeneratorPurchase.findUnique({
        where: {
          userId_round: {
            userId: session.user.id,
            round,
          },
        },
      })

      if (purchase && purchase.status === "Paid") {
        isPaid = true
        savedPercentile = purchase.savedPercentile
        // Override input percentile with saved locked percentile once paid
        percentile = purchase.savedPercentile
      }
    }

    const allItems = await PreferenceGeneratorService.generatePreferenceList({
      percentile,
      round,
      preferredBranches,
      preferredCities,
    })

    const totalCount = allItems.length
    const previewCount = isPaid ? totalCount : Math.min(5, totalCount)
    const items = isPaid ? allItems : allItems.slice(0, 5)

    return NextResponse.json({
      success: true,
      isPaid,
      savedPercentile,
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
