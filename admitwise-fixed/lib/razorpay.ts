import Razorpay from "razorpay"
import crypto from "crypto"

export function getRazorpayCredentials() {
  const mode = (process.env.PAYMENT_MODE || "").toLowerCase()
  const isTest = mode === "test"

  let keyId = isTest
    ? process.env.RAZORPAY_TEST_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY_ID
    : process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID

  let keySecret = isTest
    ? process.env.RAZORPAY_TEST_KEY_SECRET
    : process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET

  // Fallbacks if mode-specific variables are not provided
  if (!keyId) {
    keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  }
  if (!keySecret) {
    keySecret = process.env.RAZORPAY_KEY_SECRET
  }

  return { keyId, keySecret, isTest, mode }
}

const { keyId, keySecret, isTest } = getRazorpayCredentials()

// Only allow mock mode in non-production environments if credentials are missing
const isMocked = process.env.NODE_ENV !== "production" && (!keyId || !keySecret || keyId.includes("mock"))

let razorpayInstance: Razorpay | null = null

export function getRazorpay() {
  if (isMocked) {
    return null
  }

  const { keyId: currentKeyId, keySecret: currentKeySecret, isTest: currentIsTest } = getRazorpayCredentials()

  if (!currentKeyId || !currentKeySecret) {
    throw new Error("Missing Razorpay environment variables")
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: currentKeyId,
      key_secret: currentKeySecret,
    })
    console.log(`✓ Razorpay initialized in ${currentIsTest ? "TEST" : "LIVE"} mode`)
  }

  return razorpayInstance
}

export function getRazorpayKeyId(): string {
  const { keyId: currentKeyId } = getRazorpayCredentials()
  return currentKeyId || ""
}

if (isMocked) {
  console.log("⚠️ Razorpay credentials are missing or mocked. Payments will run in mock mode.")
} else {
  console.log(`✓ Razorpay initialized in ${isTest ? "TEST" : "LIVE"} mode`)
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
    const { keySecret: activeSecret } = getRazorpayCredentials()
    const hmac = crypto.createHmac("sha256", activeSecret || "")
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
