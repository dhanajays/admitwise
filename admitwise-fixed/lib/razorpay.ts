import Razorpay from "razorpay"
import crypto from "crypto"

const keyId = process.env.RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET

// Only allow mock mode in non-production environments if credentials are missing
const isMocked = process.env.NODE_ENV !== "production" && (!keyId || !keySecret || keyId.includes("mock"))

let razorpayInstance: Razorpay | null = null

export function getRazorpay() {
  if (isMocked) {
    return null
  }

  const currentKeyId = process.env.RAZORPAY_KEY_ID
  const currentKeySecret = process.env.RAZORPAY_KEY_SECRET

  if (!currentKeyId || !currentKeySecret) {
    throw new Error("Missing Razorpay environment variables")
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: currentKeyId,
      key_secret: currentKeySecret,
    })
  }

  return razorpayInstance
}

if (isMocked) {
  console.log("⚠️ Razorpay credentials are missing or mocked. Payments will run in mock mode.")
}

/** Create a Razorpay Order */
export async function createRazorpayOrder(amount: number, receiptId: string) {
  if (isMocked) {
    // Return a mock order structure
    return {
      id: `order_mock_${Math.random().toString(36).substring(2, 12)}`,
      amount: Math.round(amount * 100), // in paise
      currency: "INR",
      receipt: receiptId,
      status: "created",
      mock: true,
    }
  }

  try {
    const client = getRazorpay()
    const order = await client!.orders.create({
      amount: Math.round(amount * 100), // in paise
      currency: "INR",
      receipt: receiptId,
    })
    return {
      ...order,
      mock: false,
    }
  } catch (error: any) {
    console.error("❌ Razorpay Order Creation failed. Complete API error logged:", error)
    throw error
  }
}

/** Verify signature of checkout responses */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (process.env.NODE_ENV !== "production" && orderId.startsWith("order_mock_")) {
    return true // Mock orders always verify only in development/staging
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

  const client = getRazorpay()
  return client!.payments.refund(paymentId, amount ? { amount: Math.round(amount * 100) } : {})
}
