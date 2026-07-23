import Razorpay from "razorpay"
import crypto from "crypto"

export function getRazorpayCredentialsForProduct(productType?: string | null) {
  const pType = (productType || "").toLowerCase()
  const isPreferenceList =
    pType.includes("preference") ||
    pType.includes("pref") ||
    pType.includes("599") ||
    pType === "addon_pref"

  if (isPreferenceList) {
    // ENFORCE TEST MODE ONLY FOR ₹599 PREFERENCE LIST
    const testKeyId =
      process.env.RAZORPAY_TEST_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY_ID ||
      "rzp_test_TH3gw79Ps4yl9K"
    const testKeySecret =
      process.env.RAZORPAY_TEST_KEY_SECRET ||
      "bwye64I1huGjsIRgoH7zfJ6j"

    return {
      keyId: testKeyId,
      keySecret: testKeySecret,
      isTest: true,
    }
  }

  // ENFORCE LIVE MODE ONLY FOR ₹5000 PREMIUM & ₹6000 ELITE PLANS
  const liveKeyId =
    process.env.RAZORPAY_LIVE_KEY_ID ||
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    "rzp_live_T8xY9cnpDvuIet"
  const liveKeySecret =
    process.env.RAZORPAY_LIVE_KEY_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    "w9KHRXh5I7v0pozqBZwBCRIi"

  return {
    keyId: liveKeyId,
    keySecret: liveKeySecret,
    isTest: false,
  }
}

export function getRazorpayKeyId(productType?: string | null): string {
  const { keyId } = getRazorpayCredentialsForProduct(productType)
  return keyId || ""
}

export function getRazorpay(productType?: string | null) {
  const { keyId, keySecret, isTest } = getRazorpayCredentialsForProduct(productType)

  if (!keyId || !keySecret) {
    console.error("❌ Missing Razorpay environment variables!", { productType, isTest })
    throw new Error("Missing Razorpay environment variables")
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

/** Create a Razorpay Order */
export async function createRazorpayOrder(
  amount: number,
  receiptId: string,
  productType?: string | null
) {
  const { keyId, keySecret, isTest } = getRazorpayCredentialsForProduct(productType)

  console.log(`ℹ️ [RAZORPAY ORDER CREATION]`)
  console.log(`Selected Plan: ${productType || "general"}`)
  console.log(`Using TEST Razorpay: ${isTest}`)
  console.log(`Selected Key ID: ${keyId}`)
  console.log(`Order Account: ${isTest ? "TEST" : "LIVE"}`)

  // Check for mock mode in dev if keys missing
  const isMocked =
    process.env.NODE_ENV !== "production" && (!keyId || !keySecret || keyId.includes("mock"))

  if (isMocked) {
    const mockOrderId = `order_mock_${Math.random().toString(36).substring(2, 12)}`
    console.log(`Order Created: ${mockOrderId}`)
    return {
      id: mockOrderId,
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: receiptId,
      status: "created",
      mock: true,
      keyId,
      key: keyId,
      isTest,
    }
  }

  try {
    const client = new Razorpay({ key_id: keyId, key_secret: keySecret })
    const order = await client.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: receiptId,
    })
    console.log(`Order Created: ${order.id}`)
    return {
      ...order,
      mock: false,
      keyId,
      key: keyId,
      isTest,
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
  signature: string,
  productType?: string | null
): boolean {
  if (process.env.NODE_ENV !== "production" && orderId.startsWith("order_mock_")) {
    return true
  }

  try {
    const { keySecret } = getRazorpayCredentialsForProduct(productType)
    if (!keySecret) {
      console.error("❌ Missing Razorpay Key Secret for signature verification")
      return false
    }

    const hmac = crypto.createHmac("sha256", keySecret)
    hmac.update(`${orderId}|${paymentId}`)
    const generatedSignature = hmac.digest("hex")

    if (generatedSignature === signature) {
      return true
    }

    // Defensive fallback: check alternate keySecret if productType wasn't passed explicitly
    const alternateSecret =
      process.env.RAZORPAY_TEST_KEY_SECRET || "bwye64I1huGjsIRgoH7zfJ6j"

    const altHmac = crypto.createHmac("sha256", alternateSecret)
    altHmac.update(`${orderId}|${paymentId}`)
    return altHmac.digest("hex") === signature
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

export async function createRazorpayRefund(paymentId: string, amount?: number, productType?: string | null) {
  const client = getRazorpay(productType)
  return client.payments.refund(paymentId, amount ? { amount: Math.round(amount * 100) } : {})
}
