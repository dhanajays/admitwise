import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { createRazorpayOrder, getRazorpayKeyId } from "@/lib/razorpay"
import { z } from "zod"

const createOrderSchema = z.object({
  round: z.string(),
  percentile: z.number().min(0).max(100),
})

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as CustomSession | null
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    const { round, percentile } = parsed.data
    const userId = session.user.id
    const amount = 599 // ₹599

    // Check if user owns Premium (₹5000) or Elite (₹6000) plan which includes full Preference List Generator access
    const userRecord = await db.user.findUnique({
      where: { id: userId },
      select: { currentPlan: true },
    })

    if (userRecord && (userRecord.currentPlan === "premium" || userRecord.currentPlan === "elite")) {
      return NextResponse.json(
        { error: `Preference List Generator is already included in your ${userRecord.currentPlan === "premium" ? "₹5000 Premium" : "₹6000 Elite"} plan!` },
        { status: 400 }
      )
    }

    // Safely check if already purchased (missing purchase is NOT an error)
    let existing = null
    if (db && (db as any).preferenceGeneratorPurchase) {
      try {
        existing = await db.preferenceGeneratorPurchase.findUnique({
          where: {
            userId_round: {
              userId,
              round,
            },
          },
        })
      } catch (err) {
        console.warn("No existing purchase found or purchase check skipped:", err)
      }
    }

    if (existing && existing.status === "Paid") {
      if (Math.abs(existing.savedPercentile - percentile) < 0.05) {
        return NextResponse.json(
          { error: `You have already unlocked ${round} for percentile ${existing.savedPercentile}%.` },
          { status: 400 }
        )
      }
    }

    const receiptId = `pref_${userId.slice(-6)}_${Date.now().toString().slice(-6)}`
    const order = await createRazorpayOrder(amount, receiptId, "preference_generator")

    // Log payment attempt in standard Payment table as well
    const baseAmount = amount / 1.18
    const gstAmount = amount - baseAmount
    await db.payment.create({
      data: {
        userId,
        orderId: order.id,
        amount,
        gst: gstAmount,
        status: "Pending",
        purchaseType: `preference_${round.replace(/\s+/g, "_").toLowerCase()}`,
      },
    })

    return NextResponse.json({
      id: order.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: order.keyId || getRazorpayKeyId("preference_generator"),
      mock: (order as any).mock || false,
      user: {
        name: session.user.name,
        email: session.user.email,
      },
      round,
      percentile,
    })
  } catch (error: any) {
    console.error("Error in /api/preference-generator/payment/create-order:", error)
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
