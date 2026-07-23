import Razorpay from "razorpay"
import crypto from "crypto"

export function getRazorpayCredentialsForProduct(productType?: string | null) {
  const pType = (productType || "").toLowerCase()
  const isPreferenceList =
    pType.includes("preference") ||
    pType.includes("pref") ||
    pType === "599" ||
    pType === "addon_pref"

  let keyId = ""
  let keySecret = ""
  let isTest = false

  if (isPreferenceList) {
    // Prefer test credentials for preference list if available
    keyId =
      process.env.RAZORPAY_TEST_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY_ID ||
      ""
    keySecret = process.env.RAZORPAY_TEST_KEY_SECRET || ""

    if (keyId && keySecret) {
      isTest = true
    } else {
      // Fallback to standard/live credentials if test keys are not configured
      keyId =
        process.env.RAZORPAY_LIVE_KEY_ID ||
        process.env.RAZORPAY_KEY_ID ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        ""
      keySecret =
        process.env.RAZORPAY_LIVE_KEY_SECRET ||
        process.env.RAZORPAY_KEY_SECRET ||
        ""
      isTest = false
    }
  } else {
    // Live credentials for Premium/Elite plans
    keyId =
      process.env.RAZORPAY_LIVE_KEY_ID ||
      process.env.RAZORPAY_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      ""
    keySecret =
      process.env.RAZORPAY_LIVE_KEY_SECRET ||
      process.env.RAZORPAY_KEY_SECRET ||
      ""

    if (!keyId || !keySecret) {
      // Fallback to test credentials if live keys are not configured
      keyId =
        process.env.RAZORPAY_TEST_KEY_ID ||
        process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY_ID ||
        ""
      keySecret = process.env.RAZORPAY_TEST_KEY_SECRET || ""
      if (keyId && keySecret) {
        isTest = true
      }
    }
  }

  return { keyId, keySecret, isTest }
}

export function getRazorpayKeyId(productType?: string | null): string {
  const { keyId } = getRazorpayCredentialsForProduct(productType)
  return keyId || ""
}

export function getRazorpay(productType?: string | null) {
  const { keyId, keySecret, isTest } = getRazorpayCredentialsForProduct(productType)

  if (!keyId || !keySecret) {
    console.error("❌ Missing Razorpay environment variables!", {
      RAZORPAY_LIVE_KEY_ID_EXISTS: !!process.env.RAZORPAY_LIVE_KEY_ID,
      RAZORPAY_TEST_KEY_ID_EXISTS: !!process.env.RAZORPAY_TEST_KEY_ID,
      RAZORPAY_KEY_ID_EXISTS: !!process.env.RAZORPAY_KEY_ID,
      NEXT_PUBLIC_RAZORPAY_KEY_ID_EXISTS: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    })
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

  console.log(`ℹ️ Creating ${isTest ? "TEST" : "LIVE"} Razorpay order for '${productType || "general"}' (Key ID: ${keyId ? keyId.slice(0, 8) + "..." : "MISSING"})`)

  if (!keyId || !keySecret) {
    console.error("❌ Cannot create Razorpay Order: Key ID or Key Secret is missing in server environment variables!")
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
      keyId: keyId || "mock_key_id",
      key: keyId || "mock_key_id",
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

    // Check alternate keySecret from environment variables if productType was omitted
    const alternateSecret =
      process.env.RAZORPAY_TEST_KEY_SECRET === keySecret
        ? process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET
        : process.env.RAZORPAY_TEST_KEY_SECRET

    if (alternateSecret) {
      const altHmac = crypto.createHmac("sha256", alternateSecret)
      altHmac.update(`${orderId}|${paymentId}`)
      if (altHmac.digest("hex") === signature) {
        return true
      }
    }

    return false
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
