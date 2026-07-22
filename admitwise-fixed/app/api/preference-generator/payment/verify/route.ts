import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { verifyRazorpaySignature } from "@/lib/razorpay"
import { z } from "zod"

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
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
    const parsed = verifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment parameters" }, { status: 400 })
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, round, percentile } = parsed.data
    const userId = session.user.id

    // Verify signature unless mock in development
    const isMock = razorpay_order_id.startsWith("order_mock_") || razorpay_payment_id.startsWith("pay_mock_")
    if (!isMock) {
      const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
      if (!isValid) {
        return NextResponse.json({ error: "Payment verification failed" }, { status: 400 })
      }
    }

    // Upsert PreferenceGeneratorPurchase record
    const purchase = await db.preferenceGeneratorPurchase.upsert({
      where: {
        userId_round: {
          userId,
          round,
        },
      },
      update: {
        savedPercentile: percentile,
        paymentId: razorpay_payment_id,
        status: "Paid",
        amount: 599,
      },
      create: {
        userId,
        round,
        savedPercentile: percentile,
        paymentId: razorpay_payment_id,
        status: "Paid",
        amount: 599,
      },
    })

    // Update payment record in Payment table
    await db.payment.updateMany({
      where: { orderId: razorpay_order_id },
      data: {
        status: "Success",
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      },
    })

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchase.id,
        round: purchase.round,
        savedPercentile: purchase.savedPercentile,
      },
    })
  } catch (error: any) {
    console.error("Error in /api/preference-generator/payment/verify:", error)
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
