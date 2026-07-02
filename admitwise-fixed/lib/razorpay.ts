import Razorpay from "razorpay"
import crypto from "crypto"

const keyId = process.env.RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET

const isMocked = !keyId || !keySecret || keyId.includes("mock")

export const razorpay = !isMocked
  ? new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })
  : null

if (isMocked) {
  console.log("⚠️ Razorpay credentials are missing or mocked. Payments will run in mock mode.")
}

/** Create a Razorpay Order */
export async function createRazorpayOrder(amount: number, receiptId: string) {
  if (isMocked) {
    // Return a mock order structure
    return {
      id: `order_mock_${Math.random().toString(36).substring(2, 12)}`,
      amount: amount * 100, // in paise
      currency: "INR",
      receipt: receiptId,
      status: "created",
      mock: true,
    }
  }

  try {
    const order = await razorpay!.orders.create({
      amount: Math.round(amount * 100), // in paise
      currency: "INR",
      receipt: receiptId,
    })
    return order
  } catch (error) {
    console.error("❌ Razorpay Order Creation failed:", error)
    throw error
  }
}

/** Verify signature of checkout responses */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (isMocked && orderId.startsWith("order_mock_")) {
    return true // Mock orders always verify
  }

  try {
    const hmac = crypto.createHmac("sha256", keySecret || "")
    hmac.update(`${orderId}|${paymentId}`)
    const generatedSignature = hmac.digest("hex")
    return generatedSignature === signature
  } catch (error) {
    console.error("❌ Razorpay Signature Verification failed:", error)
    return false
  }
}

/** Verify webhook signatures */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac("sha256", secret)
    hmac.update(rawBody)
    const generatedSignature = hmac.digest("hex")
    return generatedSignature === signature
  } catch (error) {
    console.error("❌ Razorpay Webhook Signature Verification failed:", error)
    return false
  }
}

export async function createRazorpayRefund(paymentId: string, amount?: number) {
  if (isMocked) {
    return {
      id: `rfnd_mock_${Math.random().toString(36).substring(2, 12)}`,
      payment_id: paymentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      status: "processed",
      mock: true,
    }
  }

  return razorpay!.payments.refund(paymentId, amount ? { amount: Math.round(amount * 100) } : {})
}
