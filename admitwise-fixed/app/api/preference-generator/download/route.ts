import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getPreferenceListAccess, getPreferenceListEntitlement } from "@/lib/payments"
import { PreferenceGeneratorService } from "@/lib/preference-generator/service"
import { generatePreferencePDF } from "@/lib/preference-generator/pdf-generator"
import { z } from "zod"

const downloadSchema = z.object({
  percentile: z.number().min(0).max(100),
  round: z.string(),
  preferredBranches: z.array(z.string()).min(1),
  preferredCities: z.array(z.string()).min(1),
  category: z.string().optional().default("OPEN"),
  gender: z.string().optional().default("Male"),
  pwd: z.string().optional().default("No"),
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

    let { percentile, round, preferredBranches, preferredCities, category, gender, pwd } = parsed.data

    // Check Preference List access via centralized single source of truth
    const entitlement = await getPreferenceListEntitlement(session.user.id, round, percentile)
    if (entitlement.mode !== "full") {
      return NextResponse.json(
        { error: entitlement.message },
        { status: 403 }
      )
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

    const items = result.items || []

    const doc = await generatePreferencePDF(
      items,
      { percentile, round, preferredBranches, preferredCities, category, gender, pwd },
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
