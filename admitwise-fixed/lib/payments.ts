import { db } from "@/lib/db"

export async function fulfillSuccessfulPayment(orderId: string, paymentId: string, signature?: string) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { orderId },
      include: { plan: true, user: true },
    })

    if (!payment) {
      throw new Error("Payment transaction not found")
    }

    if (payment.status === "Success") {
      return {
        payment,
        user: payment.user,
        planName: payment.plan?.name || (payment.purchaseType === "addon" ? "+1 Percentile Profile Slot" : "Plan"),
        updatedLimit: payment.user.profileLimit,
        alreadyProcessed: true,
      }
    }

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "Success",
        paymentId,
        signature,
      },
      include: { plan: true, user: true },
    })

    const currentUser = await tx.user.findUnique({
      where: { id: updatedPayment.userId },
    })
    if (!currentUser) {
      throw new Error("User not found in database")
    }

    let updatedLimit = currentUser.profileLimit
    let planName = ""

    if (updatedPayment.purchaseType === "plan") {
      if (!updatedPayment.planId || !updatedPayment.plan) {
        throw new Error("Payment is missing its plan reference")
      }

      updatedLimit = updatedPayment.plan.maxProfiles
      planName = updatedPayment.plan.name

      // When a user purchases a base plan, do not expire their other active Single Predictor subscriptions
      // if they are purchasing the Single Predictor plan again.
      // If they are purchasing multi_round, premium, or elite, expire all active subscriptions.
      if (updatedPayment.planId === "single") {
        await tx.subscription.updateMany({
          where: { userId: updatedPayment.userId, status: "active", NOT: { planId: "single" } },
          data: { status: "expired", expiresAt: new Date() },
        })
      } else {
        await tx.subscription.updateMany({
          where: { userId: updatedPayment.userId, status: "active" },
          data: { status: "expired", expiresAt: new Date() },
        })
      }

      await tx.subscription.create({
        data: {
          userId: updatedPayment.userId,
          planId: updatedPayment.planId,
          maxProfiles: updatedPayment.plan.maxProfiles,
          trackerMaxProfiles: updatedPayment.plan.maxProfiles,
          status: "active",
          activatedAt: new Date(),
        },
      })

      // Count active single subscriptions to determine base limit for multiple single purchases
      const activeSingles = await tx.subscription.findMany({
        where: { userId: updatedPayment.userId, planId: "single", status: "active" }
      })
      const baseLimit = (updatedPayment.planId === "single")
        ? Math.max(activeSingles.length, 1)
        : updatedPayment.plan.maxProfiles

      // Count all successful addon payments inside the database transaction
      const successfulAddons = await tx.payment.findMany({
        where: { userId: updatedPayment.userId, purchaseType: "addon", status: "Success" }
      })
      const addonQuantity = successfulAddons.reduce((sum, p) => sum + (p.addonQuantity || 1), 0)

      await tx.user.update({
        where: { id: updatedPayment.userId },
        data: {
          currentPlan: updatedPayment.planId,
          paymentStatus: "paid",
          purchasedAddons: addonQuantity,
          profileLimit: baseLimit + addonQuantity,
          trackerProfileLimit: baseLimit + addonQuantity,
        },
      })
    } else if (updatedPayment.purchaseType === "addon") {
      const quantity = Math.max(updatedPayment.addonQuantity, 1)

      // Count all successful addon payments inside the database transaction (including this one)
      const successfulAddons = await tx.payment.findMany({
        where: { userId: updatedPayment.userId, purchaseType: "addon", status: "Success" }
      })
      const addonQuantity = successfulAddons.reduce((sum, p) => sum + (p.addonQuantity || 1), 0)
      
      // Fetch active subscription for base limits
      const activeSub = await tx.subscription.findFirst({
        where: { userId: updatedPayment.userId, status: "active" },
      })
      const basePredictorLimit = activeSub ? activeSub.maxProfiles : 0
      const baseTrackerLimit = activeSub ? activeSub.trackerMaxProfiles : 0

      updatedLimit = basePredictorLimit + addonQuantity
      const nextTrackerLimit = baseTrackerLimit + addonQuantity
      planName = `+${quantity} Add-on Profile Pack${quantity > 1 ? "s" : ""}`

      await tx.user.update({
        where: { id: updatedPayment.userId },
        data: { 
          purchasedAddons: addonQuantity,
          profileLimit: updatedLimit,
          trackerProfileLimit: nextTrackerLimit,
        },
      })
    }

    await tx.activityLog.create({
      data: {
        userId: updatedPayment.userId,
        action: "PAYMENT_SUCCESS",
        details: `Successfully purchased ${planName}. Amount: INR ${updatedPayment.amount}`,
      },
    })

    return {
      payment: updatedPayment,
      user: updatedPayment.user,
      planName,
      updatedLimit,
      alreadyProcessed: false,
    }
  }, { timeout: 25000 })
}
