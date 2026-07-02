import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { verifyRazorpaySignature } from "@/lib/razorpay"
import { sendMail } from "@/lib/email"
import { fulfillSuccessfulPayment } from "@/lib/payments"
import { z } from "zod"

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
})

export async function POST(req: Request) {
  let session = null
  let sessionUserId = null
  let razorpay_order_id = ""
  let razorpay_payment_id = ""
  let razorpay_signature = ""
  let isValid = false
  let paymentRecord = null
  let dbUserLookup = null

  try {
    session = (await getServerSession(authOptions)) as CustomSession
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
    }

    sessionUserId = session.user.id

    const parsed = verifyPaymentSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", issues: parsed.error.issues, code: "VALIDATION_ERROR" }, { status: 400 })
    }

    razorpay_order_id = parsed.data.razorpay_order_id
    razorpay_payment_id = parsed.data.razorpay_payment_id
    razorpay_signature = parsed.data.razorpay_signature

    console.log("ℹ️ Payment verification request received:", {
      session,
      authenticatedUserId: sessionUserId,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    })

    isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    console.log("ℹ️ Signature validation result:", {
      isValid,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })

    paymentRecord = await db.payment.findUnique({
      where: { orderId: razorpay_order_id },
    })
    console.log("ℹ️ Payment database lookup result:", {
      paymentRecordId: paymentRecord?.id,
      paymentUserId: paymentRecord?.userId,
      orderId: razorpay_order_id,
    })

    if (paymentRecord && paymentRecord.userId !== sessionUserId) {
      // Auto-sync: Lookup by email in case of session ID mismatch (e.g. Google OAuth ID vs database CUID)
      if (session.user.email) {
        dbUserLookup = await db.user.findUnique({
          where: { email: session.user.email }
        })
        if (dbUserLookup && paymentRecord.userId === dbUserLookup.id) {
          sessionUserId = dbUserLookup.id
        }
      }
    }

    if (!paymentRecord) {
      console.error("❌ Payment verification failed: Payment transaction not found in database.", {
        orderId: razorpay_order_id,
      })
      return NextResponse.json({ error: "Payment transaction not found", code: "PAYMENT_NOT_FOUND" }, { status: 404 })
    }

    if (paymentRecord.userId !== sessionUserId) {
      console.error("❌ Forbidden: User ID mismatch during payment verification.", {
        session,
        paymentUserId: paymentRecord.userId,
        sessionUserId,
        resolvedEmail: session.user.email,
        orderId: razorpay_order_id,
      })
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
    }

    if (!isValid) {
      console.error("❌ Payment verification failed: Cryptographic signature mismatch.", {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      })
      await db.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: "Failed",
          errorMessage: "Cryptographic signature validation failed",
        },
      })
      return NextResponse.json({ error: "Payment verification failed", code: "INVALID_SIGNATURE" }, { status: 400 })
    }

    const { user, payment, planName, updatedLimit, alreadyProcessed } = await fulfillSuccessfulPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    )

    console.log("ℹ️ Subscription update / fulfillment result:", {
      userEmail: user.email,
      planName,
      updatedLimit,
      alreadyProcessed,
    })

    if (!alreadyProcessed && user.email) {
      await sendMail({
        to: user.email,
        subject: "Payment Successful! - AdmitWise",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #2e7d32;">Payment Received!</h2>
            <p>Hi ${user.name || "Student"},</p>
            <p>Your payment of <strong>INR ${payment.amount}</strong> was processed successfully.</p>
            <p><strong>Item:</strong> ${planName}</p>
            <p><strong>Transaction ID:</strong> ${razorpay_payment_id}</p>
            <p><strong>New Profile Limit:</strong> ${updatedLimit}</p>
            <p>Your account limit has been automatically updated. You can go ahead and save your percentiles now.</p>
            <p><a href="${process.env.NEXTAUTH_URL}/predictor" style="background: #0c1844; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Go to Predictor</a></p>
          </div>
        `,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      newLimit: updatedLimit,
    })
  } catch (error: any) {
    console.error("❌ Error in /api/payments/verify:", {
      session,
      sessionUserId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      isValid,
      paymentRecord,
      dbUserLookup,
      error,
    })
    return NextResponse.json({ error: error.message || "Internal Server Error", code: "INTERNAL_SERVER_ERROR" }, { status: 500 })
  }
}
