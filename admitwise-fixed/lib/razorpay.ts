import Razorpay from "razorpay"
import crypto from "crypto"

export function getRazorpayCredentialsForProduct(productType?: string | null) {
  const pType = (productType || "").toLowerCase()
  const isPreferenceList =
    pType.includes("preference") ||
    pType.includes("pref") ||
    pType === "599" ||
    pType === "addon_pref"

  if (isPreferenceList) {
    const keyId =
      process.env.RAZORPAY_TEST_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY_ID ||
      "rzp_test_TH3gw79Ps4yl9K"
    const keySecret =
      process.env.RAZORPAY_TEST_KEY_SECRET || "bwye64I1huGjsIRgoH7zfJ6j"
    return { keyId, keySecret, isTest: true }
  }

  const keyId =
    process.env.RAZORPAY_LIVE_KEY_ID ||
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    "rzp_live_T8xY9cnpDvuIet"
  const keySecret =
    process.env.RAZORPAY_LIVE_KEY_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    "w9KHRXh5I7v0pozqBZwBCRIi"
  return { keyId, keySecret, isTest: false }
}

export function getRazorpayKeyId(productType?: string | null): string {
  const { keyId } = getRazorpayCredentialsForProduct(productType)
  return keyId || ""
}

export function getRazorpay(productType?: string | null) {
  const { keyId, keySecret, isTest } = getRazorpayCredentialsForProduct(productType)

  if (!keyId || !keySecret) {
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

  if (isTest) {
    console.log("Creating TEST Razorpay order for Preference List ₹599")
  } else {
    console.log("Creating LIVE Razorpay order for Premium/Elite")
  }

  // Check for mock mode in dev if keys missing
  const isMocked =
    process.env.NODE_ENV !== "production" && (!keyId || !keySecret || keyId.includes("mock"))

  if (isMocked) {
    return {
      id: `order_mock_${Math.random().toString(36).substring(2, 12)}`,
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: receiptId,
      status: "created",
      mock: true,
      keyId,
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
    return {
      ...order,
      mock: false,
      keyId,
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
    const hmac = crypto.createHmac("sha256", keySecret)
    hmac.update(`${orderId}|${paymentId}`)
    const generatedSignature = hmac.digest("hex")

    if (generatedSignature === signature) {
      return true
    }

    // Defensive fallback: check alternate keySecret if productType wasn't passed explicitly
    const alternateSecret = keySecret.includes("bwye64I1huGjsIRgoH7zfJ6j")
      ? (process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || "w9KHRXh5I7v0pozqBZwBCRIi")
      : (process.env.RAZORPAY_TEST_KEY_SECRET || "bwye64I1huGjsIRgoH7zfJ6j")

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
