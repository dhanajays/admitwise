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
    let isIncludedInPlan = false
    let savedPercentile: number | undefined = undefined
    let lockedPercentileMismatch = false

    if (session && session.user) {
      try {
        const slotStats = await getPreferenceSlotStats(session.user.id)
        isIncludedInPlan = slotStats.isIncludedInPlan

        const isRoundAllowed =
          slotStats.isIncludedInPlan ||
          slotStats.allowedRounds.includes(round) ||
          slotStats.purchases.some((p: any) => p.round === "ALL" || p.round === round)

        if (!isRoundAllowed) {
          isPaid = false
        } else {
          // Check if percentile matches an existing saved percentile profile
          const existingPercentile = slotStats.savedPercentiles.find(
            (sp) => Math.abs(sp - percentile) < 0.001
          )

          if (existingPercentile !== undefined) {
            isPaid = true
            percentile = existingPercentile
            savedPercentile = existingPercentile
          } else if (slotStats.totalMaxSlots === 0) {
            isPaid = false
          } else if (slotStats.usedSlots < slotStats.totalMaxSlots) {
            // New Percentile Profile & Slot Available! Save slot into database
            if (db && (db as any).preferenceSavedPercentile) {
              try {
                await db.preferenceSavedPercentile.upsert({
                  where: {
                    userId_savedPercentile: {
                      userId: session.user.id,
                      savedPercentile: percentile,
                    },
                  },
                  create: {
                    userId: session.user.id,
                    savedPercentile: percentile,
                  },
                  update: {},
                })
              } catch (saveErr) {
                console.warn("Could not save to preferenceSavedPercentile:", saveErr)
              }
            }
            isPaid = true
            savedPercentile = percentile
          } else if (slotStats.purchasedSlots > 0 && slotStats.savedPercentiles.length > 0) {
            // If user has 1 purchased slot and entering a new percentile, update/sync their saved percentile slot
            const oldPercentile = slotStats.savedPercentiles[0]
            if (db && (db as any).preferenceSavedPercentile && oldPercentile !== undefined) {
              try {
                await db.preferenceSavedPercentile.deleteMany({
                  where: { userId: session.user.id },
                })
                await db.preferenceSavedPercentile.create({
                  data: {
                    userId: session.user.id,
                    savedPercentile: percentile,
                  },
                })
              } catch (e) {
                console.warn("Could not update single slot saved percentile:", e)
              }
            }
            isPaid = true
            savedPercentile = percentile
          } else {
            isPaid = false
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
