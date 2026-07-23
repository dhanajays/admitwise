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
    } else if (
      updatedPayment.purchaseType?.startsWith("preference") ||
      updatedPayment.planId === "preference_generator"
    ) {
      planName = "Preference List Generator (₹599)"

      const purchaseModel = (tx as any)?.preferenceGeneratorPurchase || (db as any)?.preferenceGeneratorPurchase
      if (purchaseModel) {
        const existing = purchaseModel.findFirst
          ? await purchaseModel.findFirst({ where: { userId: updatedPayment.userId, round: "ALL" } })
          : null

        if (existing && purchaseModel.update) {
          await purchaseModel.update({
            where: { id: existing.id },
            data: { status: "Paid", amount: updatedPayment.amount || 599, paymentId: updatedPayment.paymentId },
          })
        } else if (purchaseModel.create) {
          await purchaseModel.create({
            data: {
              userId: updatedPayment.userId,
              round: "ALL",
              status: "Paid",
              amount: updatedPayment.amount || 599,
              paymentId: updatedPayment.paymentId,
            },
          })
        }
      }
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

export interface AdminGrantParams {
  userId: string
  accessType: string
  round?: string
  accessStatus?: string
  percentile?: number
  planType?: string
  adminUserId?: string
}

export async function fulfillAdminGrant(params: AdminGrantParams) {
  const {
    userId,
    accessType = "Preference List Generator (₹599)",
    round = "Round 1",
    accessStatus = "Active",
    percentile = 95,
    planType,
  } = params

  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error(`User with ID ${userId} not found`)
    }

    const normType = (planType || accessType || "").toLowerCase()
    const isRevoking = accessStatus === "No Access" || accessStatus === "Expired"
    const timestamp = Date.now()
    const orderId = `order_admin_${timestamp}`
    const paymentId = `pay_admin_${timestamp}`

    if (isRevoking) {
      const purchaseModel = (tx as any)?.preferenceGeneratorPurchase || (db as any)?.preferenceGeneratorPurchase
      if (purchaseModel && purchaseModel.updateMany) {
        await purchaseModel.updateMany({
          where: { userId, round },
          data: { status: "Expired" },
        })
      }
      return {
        success: true,
        message: `Preference list access revoked for ${round}`,
        plan: user.currentPlan || "free",
        allowedSavedPercentiles: 0,
        allowedRounds: [],
      }
    }

    // Case A: ₹5000 Premium Plan
    if (normType.includes("5000") || normType.includes("premium")) {
      const planId = "premium"
      const planName = "Premium CAP Support (₹5000)"
      const maxProfiles = 3
      const amount = 5000

      // 1. Update User Record
      await tx.user.update({
        where: { id: userId },
        data: {
          currentPlan: planId,
          paymentStatus: "paid",
          profileLimit: maxProfiles,
          trackerProfileLimit: maxProfiles,
        },
      })

      // 2. Expire old active subscriptions & create new Subscription
      await tx.subscription.updateMany({
        where: { userId, status: "active" },
        data: { status: "expired", expiresAt: new Date() },
      })

      const planExists = await tx.plan.findUnique({ where: { id: planId } })
      if (planExists) {
        await tx.subscription.create({
          data: {
            userId,
            planId,
            maxProfiles,
            trackerMaxProfiles: maxProfiles,
            status: "active",
            activatedAt: new Date(),
          },
        })
      }

      // 3. Create Payment record in Payment table (mirroring Razorpay)
      if (db.payment) {
        try {
          await tx.payment.create({
            data: {
              orderId,
              paymentId,
              userId,
              planId,
              amount,
              status: "Success",
              purchaseType: "plan",
            },
          })
        } catch (e) {
          console.warn("Could not record Payment entry:", e)
        }
      }

      // 4. Create/update PreferenceGeneratorPurchase
      const purchaseModel = (tx as any)?.preferenceGeneratorPurchase || (db as any)?.preferenceGeneratorPurchase
      if (purchaseModel) {
        const existing = purchaseModel.findFirst
          ? await purchaseModel.findFirst({ where: { userId, round: "ALL" } })
          : null

        if (existing && purchaseModel.update) {
          await purchaseModel.update({
            where: { id: existing.id },
            data: { status: "Paid", savedPercentile: percentile, amount, paymentId },
          })
        } else if (purchaseModel.create) {
          await purchaseModel.create({
            data: { userId, round: "ALL", savedPercentile: percentile, status: "Paid", amount, paymentId },
          })
        }
      }

      // 5. Upsert PreferenceSavedPercentile
      const savedModel = (tx as any)?.preferenceSavedPercentile || (db as any)?.preferenceSavedPercentile
      if (savedModel && savedModel.upsert) {
        await savedModel.upsert({
          where: { userId_savedPercentile: { userId, savedPercentile: percentile } },
          create: { userId, savedPercentile: percentile },
          update: {},
        })
      }

      // 6. Record ActivityLog
      await tx.activityLog.create({
        data: {
          userId,
          action: "ADMIN_GRANT_PREMIUM",
          details: `Admin manually granted ${planName}. Amount: INR ${amount}`,
        },
      })

      return {
        success: true,
        message: `Granted ${planName} successfully`,
        plan: planId,
        allowedSavedPercentiles: maxProfiles,
        allowedRounds: ["Round 1", "Round 2", "Round 3", "Round 4"],
      }
    }

    // Case B: ₹6000 Elite Plan
    if (normType.includes("6000") || normType.includes("elite")) {
      const planId = "elite"
      const planName = "Elite Admission Support (₹6000)"
      const maxProfiles = 4
      const amount = 6000

      // 1. Update User Record
      await tx.user.update({
        where: { id: userId },
        data: {
          currentPlan: planId,
          paymentStatus: "paid",
          profileLimit: maxProfiles,
          trackerProfileLimit: maxProfiles,
        },
      })

      // 2. Expire old active subscriptions & create new Subscription
      await tx.subscription.updateMany({
        where: { userId, status: "active" },
        data: { status: "expired", expiresAt: new Date() },
      })

      const planExists = await tx.plan.findUnique({ where: { id: planId } })
      if (planExists) {
        await tx.subscription.create({
          data: {
            userId,
            planId,
            maxProfiles,
            trackerMaxProfiles: maxProfiles,
            status: "active",
            activatedAt: new Date(),
          },
        })
      }

      // 3. Create Payment record in Payment table (mirroring Razorpay)
      if (db.payment) {
        try {
          await tx.payment.create({
            data: {
              orderId,
              paymentId,
              userId,
              planId,
              amount,
              status: "Success",
              purchaseType: "plan",
            },
          })
        } catch (e) {
          console.warn("Could not record Payment entry:", e)
        }
      }

      // 4. Create/update PreferenceGeneratorPurchase
      const purchaseModel = (tx as any)?.preferenceGeneratorPurchase || (db as any)?.preferenceGeneratorPurchase
      if (purchaseModel) {
        const existing = purchaseModel.findFirst
          ? await purchaseModel.findFirst({ where: { userId, round: "ALL" } })
          : null

        if (existing && purchaseModel.update) {
          await purchaseModel.update({
            where: { id: existing.id },
            data: { status: "Paid", savedPercentile: percentile, amount, paymentId },
          })
        } else if (purchaseModel.create) {
          await purchaseModel.create({
            data: { userId, round: "ALL", savedPercentile: percentile, status: "Paid", amount, paymentId },
          })
        }
      }

      // 5. Upsert PreferenceSavedPercentile
      const savedModel = (tx as any)?.preferenceSavedPercentile || (db as any)?.preferenceSavedPercentile
      if (savedModel && savedModel.upsert) {
        await savedModel.upsert({
          where: { userId_savedPercentile: { userId, savedPercentile: percentile } },
          create: { userId, savedPercentile: percentile },
          update: {},
        })
      }

      // 6. Record ActivityLog
      await tx.activityLog.create({
        data: {
          userId,
          action: "ADMIN_GRANT_ELITE",
          details: `Admin manually granted ${planName}. Amount: INR ${amount}`,
        },
      })

      return {
        success: true,
        message: `Granted ${planName} successfully`,
        plan: planId,
        allowedSavedPercentiles: maxProfiles,
        allowedRounds: ["Round 1", "Round 2", "Round 3", "Round 4"],
      }
    }

    // Case C: ₹599 Preference List Access for a specific round
    const amount = 599
    const targetRound = round || "Round 1"
    const planName = `Preference List Generator (₹599) - ${targetRound}`

    // 1. Create Payment record in Payment table (mirroring Razorpay)
    if (db.payment) {
      try {
        await tx.payment.create({
          data: {
            orderId,
            paymentId,
            userId,
            amount,
            status: "Success",
            purchaseType: "preference_generator",
          },
        })
      } catch (e) {
        console.warn("Could not record Payment entry:", e)
      }
    }

    // 2. Create/update PreferenceGeneratorPurchase
    const purchaseModel = (tx as any)?.preferenceGeneratorPurchase || (db as any)?.preferenceGeneratorPurchase
    if (purchaseModel) {
      const existing = purchaseModel.findFirst
        ? await purchaseModel.findFirst({ where: { userId, round: targetRound } })
        : null

      if (existing && purchaseModel.update) {
        await purchaseModel.update({
          where: { id: existing.id },
          data: { status: "Paid", savedPercentile: percentile || null, amount, paymentId },
        })
      } else if (purchaseModel.create) {
        await purchaseModel.create({
          data: { userId, round: targetRound, savedPercentile: percentile || null, status: "Paid", amount, paymentId },
        })
      }
    }

    // 3. Upsert PreferenceSavedPercentile if percentile provided
    if (percentile !== undefined && percentile !== null) {
      const savedModel = (tx as any)?.preferenceSavedPercentile || (db as any)?.preferenceSavedPercentile
      if (savedModel && savedModel.upsert) {
        await savedModel.upsert({
          where: { userId_savedPercentile: { userId, savedPercentile: percentile } },
          create: { userId, savedPercentile: percentile },
          update: {},
        })
      }
    }

    // 4. Record ActivityLog
    await tx.activityLog.create({
      data: {
        userId,
        action: "ADMIN_GRANT_PREFERENCE",
        details: `Admin manually granted ${planName}. Amount: INR ${amount}`,
      },
    })

    return {
      success: true,
      message: `Granted Preference List access for ${targetRound}`,
      plan: user.currentPlan || "free",
      allowedSavedPercentiles: 1,
      allowedRounds: [targetRound],
    }
  })
}

export interface PreferenceAccessResult {
  userId: string
  hasAccess: boolean
  planName: string
  currentPlan: string
  isFullPlan: boolean
  includedSlots: number
  purchasedSlots: number
  totalMaxSlots: number
  usedSlots: number
  remainingSlots: number
  allowedRounds: string[]
  savedPercentiles: number[]
  purchases: {
    id: string
    round: string
    savedPercentile: number | null
    amount: number
    status: string
  }[]
}

export async function getPreferenceListAccess(userId: string): Promise<PreferenceAccessResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { currentPlan: true },
  })

  const currentPlan = (user?.currentPlan || "free").toLowerCase()
  const isFullPlan = currentPlan === "premium" || currentPlan === "elite"
  let includedSlots = 0
  let planName = "Free Plan"

  if (currentPlan === "premium") {
    includedSlots = 3
    planName = "Premium Plan (₹5000)"
  } else if (currentPlan === "elite") {
    includedSlots = 4
    planName = "Elite Plan (₹6000)"
  }

  let purchasesList: { id: string; round: string; savedPercentile: number | null; amount: number; status: string }[] = []
  const purchaseModel = (db as any)?.preferenceGeneratorPurchase

  if (purchaseModel && purchaseModel.findMany) {
    try {
      const records = await purchaseModel.findMany({
        where: { userId },
      })
      purchasesList = records.map((p: any) => ({
        id: p.id,
        round: p.round || "Round 1",
        savedPercentile: p.savedPercentile ?? null,
        amount: p.amount ?? 599,
        status: p.status || "Paid",
      }))
    } catch (e) {
      console.error("Error loading preference generator purchases:", e)
    }
  }

  const paidPurchases = purchasesList.filter((p) => (p.status || "").toLowerCase() === "paid")
  const purchasedSlots = isFullPlan
    ? paidPurchases.filter((p) => p.amount === 599).length
    : paidPurchases.length

  const totalMaxSlots = isFullPlan ? includedSlots + purchasedSlots : Math.max(purchasedSlots, 0)

  let savedPercentiles: number[] = []
  const savedModel = (db as any)?.preferenceSavedPercentile

  if (savedModel && savedModel.findMany) {
    try {
      const records = await savedModel.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      })
      savedPercentiles = records.map((r: any) => r.savedPercentile)
    } catch (e) {
      console.error("Error loading preference saved percentiles:", e)
    }
  }

  if (savedPercentiles.length === 0 && paidPurchases.length > 0) {
    const pSet = new Set<number>()
    for (const p of paidPurchases) {
      if (p.savedPercentile !== null && p.savedPercentile !== undefined) {
        pSet.add(p.savedPercentile)
      }
    }
    savedPercentiles = Array.from(pSet)
  }

  const usedSlots = savedPercentiles.length
  const remainingSlots = Math.max(0, totalMaxSlots - usedSlots)
  const hasAccess = isFullPlan || paidPurchases.length > 0 || totalMaxSlots > 0

  let allowedRounds: string[] = []
  if (isFullPlan) {
    allowedRounds = ["Round 1", "Round 2", "Round 3", "Round 4"]
  } else {
    const hasAll = paidPurchases.some((p) => p.round === "ALL")
    if (hasAll) {
      allowedRounds = ["Round 1", "Round 2", "Round 3", "Round 4"]
    } else {
      allowedRounds = Array.from(new Set(paidPurchases.map((p) => p.round).filter(Boolean)))
    }
  }

  if (!isFullPlan && paidPurchases.length > 0 && planName === "Free Plan") {
    planName = `Preference List (${paidPurchases[0]?.round || "Round 1"})`
  }

  return {
    userId,
    hasAccess,
    planName,
    currentPlan,
    isFullPlan,
    includedSlots,
    purchasedSlots,
    totalMaxSlots,
    usedSlots,
    remainingSlots,
    allowedRounds,
    savedPercentiles,
    purchases: purchasesList,
  }
}

export interface EntitlementResult {
  hasAccess: boolean
  previewOnly: boolean
  pdfEnabled: boolean
  isFullPlan: boolean
  planName: string
  allowedRounds: string[]
  savedPercentiles: number[]
  reason?: string
}

export async function evaluatePreferenceListAccess(
  userId: string,
  selectedRound: string,
  enteredPercentile: number
): Promise<EntitlementResult> {
  const access = await getPreferenceListAccess(userId)

  if (access.isFullPlan) {
    return {
      hasAccess: true,
      previewOnly: false,
      pdfEnabled: true,
      isFullPlan: true,
      planName: access.planName,
      allowedRounds: ["Round 1", "Round 2", "Round 3", "Round 4"],
      savedPercentiles: access.savedPercentiles,
    }
  }

  // 1. Evaluate whether the selected CAP Round has been purchased
  const isRoundPurchased = access.allowedRounds.includes(selectedRound) || access.allowedRounds.includes("ALL")

  if (!isRoundPurchased) {
    // RULE 2: Unpaid CAP Round -> ALWAYS Preview Mode (Top 5 Colleges, PDF Disabled, Purchase CTA)
    return {
      hasAccess: false,
      previewOnly: true,
      pdfEnabled: false,
      isFullPlan: false,
      planName: access.planName,
      allowedRounds: access.allowedRounds,
      savedPercentiles: access.savedPercentiles,
      reason: `CAP Round '${selectedRound}' has not been purchased for ₹599.`,
    }
  }

  // 2. CAP Round IS purchased! Check if enteredPercentile matches saved percentiles or if a slot is available
  const isPercentileSaved = access.savedPercentiles.some(
    (sp) => Math.abs(sp - enteredPercentile) < 0.001
  )

  const hasSlotAvailable = access.usedSlots < access.totalMaxSlots || access.savedPercentiles.length === 0

  if (isPercentileSaved || hasSlotAvailable) {
    // RULE 1 & RULE 4: Round Purchased AND Valid/New Saved Percentile -> FULL UNLOCKED ACCESS!
    return {
      hasAccess: true,
      previewOnly: false,
      pdfEnabled: true,
      isFullPlan: false,
      planName: access.planName,
      allowedRounds: access.allowedRounds,
      savedPercentiles: access.savedPercentiles,
    }
  }

  // Mismatched percentile on a purchased round with all slots exhausted
  return {
    hasAccess: false,
    previewOnly: true,
    pdfEnabled: false,
    isFullPlan: false,
    planName: access.planName,
    allowedRounds: access.allowedRounds,
    savedPercentiles: access.savedPercentiles,
    reason: `All saved percentile slots are used (${access.savedPercentiles.join("%, ")}%).`,
  }
}
