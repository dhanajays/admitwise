import { syncWithDatabase } from "./subscription/store"

export function loadRazorpayScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false)
    if ((window as any).Razorpay) return resolve(true)

    const script = document.createElement("script")
    script.src = src
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export async function checkout({
  purchaseType,
  planId,
  onSuccess,
  onError,
}: {
  purchaseType: "plan" | "addon"
  planId?: string
  onSuccess?: (details?: { orderId: string; paymentId: string }) => void
  onError?: (err: string) => void
}) {
  try {
    const loaded = await loadRazorpayScript("https://checkout.razorpay.com/v1/checkout.js")
    if (!loaded) {
      throw new Error("Razorpay SDK failed to load. Please check your network connection.")
    }

    // 1. Create order on backend
    const res = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ purchaseType, planId }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Failed to initiate payment")
    }

    const orderData = await res.json()

    // 2. Open Razorpay Checkout Popup
    return new Promise<void>((resolve, reject) => {
      if (orderData.mock || (orderData.id && orderData.id.startsWith("order_mock_"))) {
        if (process.env.NODE_ENV === "production") {
          const err = new Error("Mock payments are disabled in production mode.")
          if (onError) onError(err.message)
          reject(err)
          return
        }
        const isAutomation = typeof navigator !== "undefined" && navigator.webdriver
        const proceed = isAutomation || window.confirm("Mock Mode: Would you like to approve this simulated payment?")
        if (proceed) {
          const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 12)}`
          const mockOrderId = orderData.id || orderData.orderId
          fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: mockOrderId,
              razorpay_payment_id: mockPaymentId,
              razorpay_signature: "mock_signature",
            }),
          })
            .then(async (verifyRes) => {
              if (!verifyRes.ok) {
                const verifyErr = await verifyRes.json()
                throw new Error(verifyErr.error || "Payment verification failed")
              }
              await syncWithDatabase()
              if (onSuccess) {
                onSuccess({
                  orderId: mockOrderId,
                  paymentId: mockPaymentId,
                })
              }
              resolve()
            })
            .catch((verifyError) => {
              console.error("Payment Verification Error:", verifyError)
              if (onError) onError(verifyError.message || "Payment verification failed")
              reject(verifyError)
            })
        } else {
          if (onError) onError("Payment cancelled by user")
          reject(new Error("Payment cancelled by user"))
        }
        return
      }

      const razorpayKey = orderData.key || orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID

      if (!razorpayKey) {
        const err = new Error("Razorpay Key ID is missing from server response. Please verify environment configuration.")
        if (onError) onError(err.message)
        reject(err)
        return
      }

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "AdmitWise",
        description: purchaseType === "plan" ? `Upgrade to ${planId}` : "Buy Additional Percentile Slot",
        order_id: orderData.id || orderData.orderId,
        handler: async function (response: any) {
          try {
            // 3. Verify Payment Signature
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            if (!verifyRes.ok) {
              const verifyErr = await verifyRes.json()
              throw new Error(verifyErr.error || "Payment verification failed")
            }

            // 4. Force-sync client cache from backend
            await syncWithDatabase()

            if (onSuccess) {
              onSuccess({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
              })
            }
            resolve()
          } catch (verifyError: any) {
            console.error("Payment Verification Error:", verifyError)
            if (onError) onError(verifyError.message || "Payment verification failed")
            reject(verifyError)
          }
        },
        prefill: {
          name: orderData.user?.name || "",
          email: orderData.user?.email || "",
        },
        theme: {
          color: "#0c1844",
        },
        modal: {
          ondismiss: function () {
            if (onError) onError("Payment cancelled by user")
            reject(new Error("Payment cancelled by user"))
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    })
  } catch (error: any) {
    console.error("Checkout Error:", error)
    if (onError) onError(error.message || "Payment setup failed")
    throw error
  }
}
