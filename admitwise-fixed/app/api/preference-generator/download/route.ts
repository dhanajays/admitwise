import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { PreferenceGeneratorService } from "@/lib/preference-generator/service"
import { generatePreferencePDF } from "@/lib/preference-generator/pdf-generator"
import { z } from "zod"

const downloadSchema = z.object({
  percentile: z.number().min(0).max(100),
  round: z.string(),
  preferredBranches: z.array(z.string()).min(1),
  preferredCities: z.array(z.string()).min(1),
})

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as CustomSession | null
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = downloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    let { percentile, round, preferredBranches, preferredCities } = parsed.data

    // Check if user is subscriber or purchased round
    let isPaid = false
    const userRecord = await db.user.findUnique({
      where: { id: session.user.id },
      select: { currentPlan: true },
    })

    if (userRecord && (userRecord.currentPlan === "premium" || userRecord.currentPlan === "elite")) {
      isPaid = true
    } else if (db && (db as any).preferenceGeneratorPurchase) {
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
        percentile = purchase.savedPercentile
      }
    }

    if (!isPaid) {
      return NextResponse.json(
        { error: `You must unlock ${round} before downloading the PDF preference list.` },
        { status: 403 }
      )
    }

    const items = await PreferenceGeneratorService.generatePreferenceList({
      percentile,
      round,
      preferredBranches,
      preferredCities,
    })

    const doc = await generatePreferencePDF(
      items,
      { percentile, round, preferredBranches, preferredCities },
      session.user.name
    )

    const pdfBuffer = doc.output("arraybuffer")

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="AdmitWise_CAP_Preference_List_${round.replace(/\s+/g, "_")}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("Error in /api/preference-generator/download:", error)
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
