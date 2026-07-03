import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay"
import { sendMail } from "@/lib/email"
import { fulfillSuccessfulPayment } from "@/lib/payments"

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get("x-razorpay-signature") || ""
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || ""

    const isValid = webhookSecret ? verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret) : false
    const allowMockWebhook = process.env.RAZORPAY_WEBHOOK_ALLOW_MOCK === "true"
    if (!isValid && !allowMockWebhook) {
      console.error("❌ Razorpay webhook signature verification failed. Webhook signature is invalid.")
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 })
    }

    const event = JSON.parse(rawBody)
    const eventName = event.event

    if (eventName === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity
      const orderId = paymentEntity?.order_id
      const paymentId = paymentEntity?.id

      if (!orderId || !paymentId) {
        return NextResponse.json({ error: "Malformed payment event" }, { status: 400 })
      }

      const { user, payment, planName, updatedLimit, alreadyProcessed } = await fulfillSuccessfulPayment(
        orderId,
        paymentId,
        signature
      )

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
              <p><strong>Transaction ID:</strong> ${paymentId}</p>
              <p><strong>New Profile Limit:</strong> ${updatedLimit}</p>
            </div>
          `,
        })
      }
    }

    if (eventName === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity
      const orderId = paymentEntity?.order_id
      const errorDescription = paymentEntity?.error_description || "Unknown payment gateway failure"

      if (orderId) {
        await db.payment.updateMany({
          where: { orderId },
          data: {
            status: "Failed",
            errorMessage: errorDescription,
          },
        })
      }
    }

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("Error in Razorpay webhook handler:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
