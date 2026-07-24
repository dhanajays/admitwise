import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { createRazorpayOrder, getRazorpayKeyId } from "@/lib/razorpay"
import { z } from "zod"

import { getPreferenceListEntitlement } from "@/lib/payments"

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

    // Check entitlement via single source of truth helper
    const entitlement = await getPreferenceListEntitlement(userId, round, percentile)
    if (entitlement.mode === "full") {
      return NextResponse.json(
        { error: `You have already unlocked ${round} for percentile ${percentile}%.` },
        { status: 400 }
      )
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

    const activeKey = order.keyId || order.key || getRazorpayKeyId("preference_generator")

    return NextResponse.json({
      id: order.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: activeKey,
      keyId: activeKey,
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
