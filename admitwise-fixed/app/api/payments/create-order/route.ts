import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { createRazorpayOrder } from "@/lib/razorpay"
import { z } from "zod"

const createOrderSchema = z.object({
  purchaseType: z.enum(["plan", "addon"]),
  planId: z.string().optional(),
})

export async function POST(req: Request) {
  let session = null
  let userId = null
  let purchaseType = null
  let planId = null
  let userLookup = null

  try {
    session = (await getServerSession(authOptions)) as CustomSession
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
    }

    userId = session.user.id
    const parsed = createOrderSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", issues: parsed.error.issues, code: "VALIDATION_ERROR" }, { status: 400 })
    }

    purchaseType = parsed.data.purchaseType
    planId = parsed.data.planId || null

    // 1. Verify that user exists in the database
    userLookup = await db.user.findUnique({
      where: { id: userId },
    })

    if (!userLookup && session.user.email) {
      // Auto-sync: Lookup by email in case of ID mismatch (e.g. Google OAuth ID vs database CUID)
      const byEmail = await db.user.findUnique({
        where: { email: session.user.email },
      })
      if (byEmail) {
        userLookup = byEmail
        userId = byEmail.id
      } else {
        // Auto-create user record if completely missing
        const studentRole = await db.role.findFirst({
          where: { name: "Student" },
        })
        userLookup = await db.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || "Student",
            currentPlan: "free",
            profileLimit: 0,
            trackerProfileLimit: 0,
            roleId: studentRole?.id,
          },
        })
        userId = userLookup.id
      }
    }

    if (!userLookup) {
      console.error("❌ Payment order creation failed: User not found in database and email missing in session.", {
        session,
        userId,
        planId,
        purchaseType,
      })
      return NextResponse.json({
        error: "Your session user was not found in the database and could not be synchronized.",
        code: "USER_NOT_FOUND"
      }, { status: 400 })
    }

    let amount = 0
    let planDetails = null

    // Enforce business logic override: if user has a base plan and tries to buy Single Predictor,
    // convert it securely to an Add-on purchase.
    if (purchaseType === "plan" && planId === "single") {
      if (userLookup.currentPlan && userLookup.currentPlan !== "free") {
        purchaseType = "addon"
        planId = null
      }
    }

    if (purchaseType === "plan") {
      if (!planId) {
        return NextResponse.json({ error: "Plan ID is required", code: "PLAN_REQUIRED" }, { status: 400 })
      }
      planDetails = await db.plan.findUnique({
        where: { id: planId },
      })
      if (!planDetails || !planDetails.isEnabled) {
        return NextResponse.json({ error: "Invalid or disabled Plan ID", code: "INVALID_PLAN" }, { status: 400 })
      }
      amount = planDetails.price
    } else if (purchaseType === "addon") {
      amount = 499 // Profile Addon is ₹499
    } else {
      return NextResponse.json({ error: "Invalid purchase type", code: "INVALID_PURCHASE_TYPE" }, { status: 400 })
    }

    // 18% GST calculation
    const baseAmount = amount / 1.18
    const gstAmount = amount - baseAmount

    // Create Razorpay Order only after successful user validation
    const receiptId = `rcpt_${userId.slice(-6)}_${Date.now().toString().slice(-6)}`
    const order = await createRazorpayOrder(amount, receiptId)

    // Log payment attempt in database
    try {
      await db.payment.create({
        data: {
          userId,
          planId: purchaseType === "plan" ? planId : null,
          orderId: order.id,
          amount,
          gst: gstAmount,
          status: "Pending",
          purchaseType,
          addonQuantity: purchaseType === "addon" ? 1 : 0,
        },
      })
    } catch (prismaError: any) {
      console.error("❌ Prisma payment record creation failed:", {
        session,
        userId,
        userLookup,
        planId,
        purchaseType,
        error: prismaError,
      })
      return NextResponse.json({
        error: "Failed to log payment attempt in the database.",
        code: "DATABASE_ERROR",
        details: prismaError.message || String(prismaError)
      }, { status: 500 })
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID || "rzp_test_mockkeyid123",
      user: {
        name: session.user.name,
        email: session.user.email,
      },
      mock: (order as any).mock || false,
    })
  } catch (error: any) {
    console.error("❌ Error in /api/payments/create-order:", {
      session,
      userId,
      userLookup,
      planId,
      purchaseType,
      error,
    })
    return NextResponse.json({
      error: error.message || "Internal Server Error",
      code: "INTERNAL_SERVER_ERROR"
    }, { status: 500 })
  }
}
