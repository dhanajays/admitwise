import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"

function isAdmin(role?: string) {
  return !!role && ["Super Admin", "Manager", "Support Executive", "Counsellor"].includes(role)
}

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as CustomSession
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId") || undefined
    const exam = searchParams.get("exam") || undefined
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const minPercentile = searchParams.get("minPercentile")
    const maxPercentile = searchParams.get("maxPercentile")

    const admin = isAdmin(session.user.role)
    const effectiveUserId = admin ? userId : session.user.id

    const history = await db.predictionHistory.findMany({
      where: {
        ...(effectiveUserId ? { userId: effectiveUserId } : {}),
        ...(exam ? { exam } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
        ...(minPercentile || maxPercentile
          ? {
              percentile: {
                ...(minPercentile ? { gte: Number(minPercentile) } : {}),
                ...(maxPercentile ? { lte: Number(maxPercentile) } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: admin ? { user: { select: { name: true, email: true } } } : undefined,
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error("Error in /api/prediction-history GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
