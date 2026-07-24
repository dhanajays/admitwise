import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { verifyRazorpaySignature } from "@/lib/razorpay"
import { getPreferenceListEntitlement } from "@/lib/payments"
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
      const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, "preference_generator")
      if (!isValid) {
        return NextResponse.json({ error: "Payment verification failed" }, { status: 400 })
      }
    }

    // Record PreferenceGeneratorPurchase & save percentile to PreferenceSavedPercentile
    let purchaseId = `purchase_${Date.now()}`
    let purchasePercentile = percentile

    if (db && (db as any).preferenceGeneratorPurchase) {
      try {
        const targetRound = round || "Round 1"
        const existingPurchase = await db.preferenceGeneratorPurchase.findFirst({
          where: { userId, round: targetRound },
        })

        if (existingPurchase) {
          await db.preferenceGeneratorPurchase.update({
            where: { id: existingPurchase.id },
            data: {
              status: "Paid",
              paymentId: razorpay_payment_id,
              savedPercentile: percentile,
              amount: 599,
            },
          })
          purchaseId = existingPurchase.id
        } else {
          const purchase = await db.preferenceGeneratorPurchase.create({
            data: {
              userId,
              round: targetRound,
              savedPercentile: percentile,
              paymentId: razorpay_payment_id,
              status: "Paid",
              amount: 599,
            },
          })
          purchaseId = purchase.id
        }
      } catch (err) {
        console.error("Error updating preference generator purchase:", err)
      }
    }

    if (percentile !== undefined && percentile !== null && db && (db as any).preferenceSavedPercentile) {
      try {
        await db.preferenceSavedPercentile.upsert({
          where: {
            userId_savedPercentile: {
              userId,
              savedPercentile: percentile,
            },
          },
          create: {
            userId,
            savedPercentile: percentile,
          },
          update: {},
        })
      } catch (err) {
        console.error("Error saving to preferenceSavedPercentile:", err)
      }
    }

    // Update payment record in Payment table
    if (db && db.payment) {
      try {
        await db.payment.updateMany({
          where: { orderId: razorpay_order_id },
          data: {
            status: "Success",
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
          },
        })
      } catch (err) {
        console.error("Error updating payment record:", err)
      }
    }

    // Re-evaluate entitlement via central single source of truth
    const entitlement = await getPreferenceListEntitlement(userId, round, percentile)

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      purchase: {
        id: purchaseId,
        round,
        savedPercentile: percentile,
      },
      entitlement,
    })
  } catch (error: any) {
    console.error("Error in /api/preference-generator/payment/verify:", error)
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
