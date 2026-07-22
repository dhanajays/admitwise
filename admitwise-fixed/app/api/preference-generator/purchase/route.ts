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

    let purchase = null
    if (db && (db as any).preferenceGeneratorPurchase) {
      try {
        purchase = await db.preferenceGeneratorPurchase.findUnique({
          where: {
            userId_round: {
              userId: session.user.id,
              round,
            },
          },
        })
      } catch (e) {
        console.error("Error looking up purchase record:", e)
      }
    }

    if (purchase && purchase.status === "Paid") {
      return NextResponse.json({
        hasPurchased: true,
        isPaid: true,
        purchase: {
          id: purchase.id,
          round: purchase.round,
          savedPercentile: purchase.savedPercentile,
          createdAt: purchase.createdAt.toISOString(),
        },
      })
    }

    return NextResponse.json({ hasPurchased: false, isPaid: false, purchase: null })
  } catch (error) {
    console.error("Error in /api/preference-generator/purchase GET:", error)
    return NextResponse.json({ hasPurchased: false, isPaid: false, purchase: null })
  }
}
