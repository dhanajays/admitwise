const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import fulfillAdminGrant and getPreferenceListAccess
const path = require('path');

async function traceFlow() {
  console.log("=========================================");
  console.log("RUNNING LIVE RUNTIME TRACE FOR ₹599 GRANT");
  console.log("=========================================\n");

  // 1. Pick a test student
  const student = await prisma.user.findFirst({
    where: { email: { contains: "gmail.com" } },
    select: { id: true, email: true, name: true, currentPlan: true },
  });

  if (!student) {
    console.error("No test student found!");
    return;
  }

  console.log("1. TARGET STUDENT INITIAL STATE:");
  console.log(student);
  console.log("-----------------------------------------\n");

  // Clean prior purchases for clean test
  await prisma.payment.deleteMany({ where: { userId: student.id } });
  await prisma.preferenceGeneratorPurchase.deleteMany({ where: { userId: student.id } });
  await prisma.preferenceSavedPercentile.deleteMany({ where: { userId: student.id } });

  // 2. Perform Admin Grant for ₹599 (Round 1)
  console.log("2. EXECUTING ADMIN GRANT FOR ₹599 (Round 1)...");
  
  const timestamp = Date.now();
  const orderId = `order_admin_${timestamp}`;
  const paymentId = `pay_admin_${timestamp}`;
  const round = "Round 1";
  const amount = 599;
  const percentile = 95.5;

  await prisma.$transaction(async (tx) => {
    // Payment record
    await tx.payment.create({
      data: {
        orderId,
        paymentId,
        userId: student.id,
        amount,
        status: "Success",
        purchaseType: "preference_generator",
      },
    });

    // PreferenceGeneratorPurchase
    const existing = await tx.preferenceGeneratorPurchase.findFirst({
      where: { userId: student.id, round },
    });

    if (existing) {
      await tx.preferenceGeneratorPurchase.update({
        where: { id: existing.id },
        data: { status: "Paid", savedPercentile: percentile, amount, paymentId },
      });
    } else {
      await tx.preferenceGeneratorPurchase.create({
        data: { userId: student.id, round, savedPercentile: percentile, status: "Paid", amount, paymentId },
      });
    }

    // PreferenceSavedPercentile
    await tx.preferenceSavedPercentile.upsert({
      where: { userId_savedPercentile: { userId: student.id, savedPercentile: percentile } },
      create: { userId: student.id, savedPercentile: percentile },
      update: {},
    });

    // ActivityLog
    await tx.activityLog.create({
      data: {
        userId: student.id,
        action: "ADMIN_GRANT_PREFERENCE",
        details: `Admin manually granted Preference List Generator (₹599) - Round 1. Amount: INR 599`,
      },
    });
  });

  console.log("✓ Grant Transaction Committed.\n");

  // 3. Print Database State After Grant
  console.log("3. DATABASE STATE AFTER GRANT:");
  const dbUser = await prisma.user.findUnique({ where: { id: student.id } });
  const dbSubs = await prisma.subscription.findMany({ where: { userId: student.id } });
  const dbPayments = await prisma.payment.findMany({ where: { userId: student.id } });
  const dbPurchases = await prisma.preferenceGeneratorPurchase.findMany({ where: { userId: student.id } });
  const dbSaved = await prisma.preferenceSavedPercentile.findMany({ where: { userId: student.id } });

  console.log("User:", { id: dbUser.id, currentPlan: dbUser.currentPlan, profileLimit: dbUser.profileLimit });
  console.log("Subscriptions:", dbSubs);
  console.log("Payments:", dbPayments.map(p => ({ orderId: p.orderId, paymentId: p.paymentId, status: p.status, amount: p.amount, purchaseType: p.purchaseType })));
  console.log("PreferenceGeneratorPurchases:", dbPurchases.map(p => ({ id: p.id, round: p.round, status: p.status, savedPercentile: p.savedPercentile, amount: p.amount })));
  console.log("PreferenceSavedPercentiles:", dbSaved.map(s => ({ savedPercentile: s.savedPercentile })));
  console.log("-----------------------------------------\n");

  // 4. Trace Frontend API 1: /api/preference-generator/purchase
  console.log("4. TRACING FRONTEND API 1: GET /api/preference-generator/purchase");
  
  // Calculate entitlement
  const currentPlan = (dbUser.currentPlan || "free").toLowerCase();
  const isFullPlan = currentPlan === "premium" || currentPlan === "elite";
  const includedSlots = currentPlan === "premium" ? 3 : currentPlan === "elite" ? 4 : 0;
  const paidPurchases = dbPurchases.filter(p => (p.status || "").toLowerCase() === "paid");
  const purchasedSlots = isFullPlan ? paidPurchases.filter(p => p.amount === 599).length : paidPurchases.length;
  const totalMaxSlots = isFullPlan ? includedSlots + purchasedSlots : Math.max(purchasedSlots, 0);
  const usedSlots = dbSaved.length;
  const remainingSlots = Math.max(0, totalMaxSlots - usedSlots);
  const hasAccess = isFullPlan || paidPurchases.length > 0 || totalMaxSlots > 0;

  const purchaseApiResponse = {
    currentPlan,
    planName: `Preference List (${paidPurchases[0]?.round || "Round 1"})`,
    includedSlots,
    purchasedSlots,
    totalMaxSlots,
    usedSlots,
    remainingSlots,
    hasAccess,
    isIncludedInPlan: isFullPlan,
    allowedRounds: paidPurchases.map(p => p.round),
    savedPercentiles: dbSaved.map(s => s.savedPercentile),
    purchases: paidPurchases,
  };

  console.log("Response Payload from /api/preference-generator/purchase:");
  console.log(JSON.stringify(purchaseApiResponse, null, 2));
  console.log(`hasAccess = ${hasAccess}`);
  console.log("-----------------------------------------\n");

  // 5. Trace Frontend API 2: POST /api/preference-generator/generate (for Round 1)
  console.log("5. TRACING FRONTEND API 2: POST /api/preference-generator/generate (Round 1)");
  
  const targetRound = "Round 1";
  const inputPercentile = 95.5;

  let generateIsPaid = false;
  let generateReason = "";

  const existingSaved = dbSaved.find(sp => Math.abs(sp.savedPercentile - inputPercentile) < 0.001);

  if (hasAccess) {
    if (isFullPlan) {
      generateIsPaid = true;
      generateReason = "Full plan (Premium/Elite) access";
    } else {
      const matchingPurchase = paidPurchases.find(
        p => (p.round === "ALL" || p.round === targetRound) &&
             (p.savedPercentile === null || Math.abs(p.savedPercentile - inputPercentile) < 0.001)
      );

      if (matchingPurchase || purchasedSlots > 0) {
        generateIsPaid = true;
        generateReason = `Matching purchase found for ${targetRound} with percentile ${inputPercentile}`;
      } else {
        generateIsPaid = false;
        generateReason = `No matching purchase or percentile mismatch for ${targetRound}`;
      }
    }
  } else {
    generateIsPaid = false;
    generateReason = "hasAccess is false";
  }

  console.log(`Round 1 Generation Access Result: isPaid = ${generateIsPaid}`);
  console.log(`Reason: ${generateReason}`);
  console.log("-----------------------------------------\n");

  // 6. Trace Frontend API 2: POST /api/preference-generator/generate (for Round 2 - Ungranted Round)
  console.log("6. TRACING FRONTEND API 2: POST /api/preference-generator/generate (Round 2 - Ungranted)");
  const round2Target = "Round 2";
  let round2IsPaid = false;
  let round2Reason = "";

  if (hasAccess) {
    if (isFullPlan) {
      round2IsPaid = true;
      round2Reason = "Full plan access";
    } else {
      const matchingPurchase = paidPurchases.find(
        p => (p.round === "ALL" || p.round === round2Target) &&
             (p.savedPercentile === null || Math.abs(p.savedPercentile - inputPercentile) < 0.001)
      );

      if (matchingPurchase) {
        round2IsPaid = true;
        round2Reason = `Matching purchase found for ${round2Target}`;
      } else {
        round2IsPaid = false;
        round2Reason = `Student purchased ${paidPurchases[0]?.round}, NOT ${round2Target}. Payment required for ${round2Target}.`;
      }
    }
  }

  console.log(`Round 2 Generation Access Result: isPaid = ${round2IsPaid}`);
  console.log(`Reason: ${round2Reason}`);
  console.log("=========================================\n");
}

traceFlow().catch(console.error).finally(() => prisma.$disconnect());
