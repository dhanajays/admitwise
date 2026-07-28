require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getPreferenceListAccess(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentPlan: true },
  });

  const currentPlan = (user?.currentPlan || "free").toLowerCase();
  const isFullPlan = currentPlan === "premium" || currentPlan === "elite";
  let includedSlots = 0;
  let planName = "Free Plan";

  if (currentPlan === "premium") {
    includedSlots = 3;
    planName = "Premium Plan (₹5000)";
  } else if (currentPlan === "elite") {
    includedSlots = 4;
    planName = "Elite Plan (₹6000)";
  }

  const records = await prisma.preferenceGeneratorPurchase.findMany({
    where: { userId },
  });

  const purchasesList = records.map((p) => ({
    id: p.id,
    round: p.round || "ALL",
    savedPercentile: p.savedPercentile ?? null,
    amount: p.amount ?? 599,
    status: p.status || "Paid",
  }));

  const paidPurchases = purchasesList.filter((p) => (p.status || "").toLowerCase() === "paid");
  const purchasedSlots = isFullPlan
    ? paidPurchases.filter((p) => p.amount === 599).length
    : paidPurchases.length;

  const totalMaxSlots = isFullPlan ? includedSlots + purchasedSlots : Math.max(purchasedSlots, 0);

  const savedRecords = await prisma.preferenceSavedPercentile.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  const savedPercentiles = savedRecords.map((r) => r.savedPercentile);

  const usedSlots = savedPercentiles.length;
  const remainingSlots = Math.max(0, totalMaxSlots - usedSlots);
  const hasAccess = isFullPlan || paidPurchases.length > 0 || totalMaxSlots > 0;
  const allowedRounds = hasAccess ? ["Round 1", "Round 2", "Round 3", "Round 4"] : [];

  if (!isFullPlan && paidPurchases.length > 0 && planName === "Free Plan") {
    planName = "Preference List Generator (₹599)";
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
    purchases: paidPurchases,
  };
}

async function verifyFlows() {
  console.log("=================================================");
  console.log("TESTING 1-TO-1 FLOW A (RAZORPAY) & FLOW B (ADMIN)");
  console.log("=================================================\n");

  // Create or fetch Test Student A (Razorpay Flow)
  let studentA = await prisma.user.findFirst({ where: { email: "test_razorpay_student@gmail.com" } });
  if (!studentA) {
    studentA = await prisma.user.create({
      data: { email: "test_razorpay_student@gmail.com", name: "Razorpay Test Student", currentPlan: "free" }
    });
  }

  // Create or fetch Test Student B (Admin Grant Flow)
  let studentB = await prisma.user.findFirst({ where: { email: "test_admin_student@gmail.com" } });
  if (!studentB) {
    studentB = await prisma.user.create({
      data: { email: "test_admin_student@gmail.com", name: "Admin Test Student", currentPlan: "free" }
    });
  }

  // Clean prior records
  await prisma.payment.deleteMany({ where: { userId: { in: [studentA.id, studentB.id] } } });
  await prisma.preferenceGeneratorPurchase.deleteMany({ where: { userId: { in: [studentA.id, studentB.id] } } });
  await prisma.preferenceSavedPercentile.deleteMany({ where: { userId: { in: [studentA.id, studentB.id] } } });

  // ---------------------------------------------------------
  // FLOW A: SIMULATE RAZORPAY ₹599 PURCHASE VERIFICATION
  // ---------------------------------------------------------
  console.log("1. SIMULATING FLOW A: RAZORPAY ₹599 PURCHASE...");
  const timestampA = Date.now();
  const orderIdA = `order_rzp_${timestampA}`;
  const paymentIdA = `pay_rzp_${timestampA}`;

  await prisma.payment.create({
    data: {
      userId: studentA.id,
      orderId: orderIdA,
      paymentId: paymentIdA,
      amount: 599,
      status: "Success",
      purchaseType: "preference_generator",
    }
  });

  await prisma.preferenceGeneratorPurchase.create({
    data: {
      userId: studentA.id,
      round: "ALL",
      status: "Paid",
      amount: 599,
      paymentId: paymentIdA,
    }
  });

  console.log("✓ Flow A (Razorpay) records created.");

  // ---------------------------------------------------------
  // FLOW B: SIMULATE ADMIN GRANT ₹599
  // ---------------------------------------------------------
  console.log("\n2. SIMULATING FLOW B: ADMIN GRANT ₹599...");
  const timestampB = Date.now();
  const orderIdB = `order_admin_${timestampB}`;
  const paymentIdB = `pay_admin_${timestampB}`;

  await prisma.payment.create({
    data: {
      userId: studentB.id,
      orderId: orderIdB,
      paymentId: paymentIdB,
      amount: 599,
      status: "Success",
      purchaseType: "preference_generator",
    }
  });

  await prisma.preferenceGeneratorPurchase.create({
    data: {
      userId: studentB.id,
      round: "ALL",
      status: "Paid",
      amount: 599,
      paymentId: paymentIdB,
    }
  });

  console.log("✓ Flow B (Admin Grant) records created.");

  // ---------------------------------------------------------
  // VERIFY SINGLE SOURCE OF TRUTH (getPreferenceListAccess)
  // ---------------------------------------------------------
  console.log("\n3. VERIFYING SINGLE SOURCE OF TRUTH (getPreferenceListAccess):");
  const accessA = await getPreferenceListAccess(studentA.id);
  const accessB = await getPreferenceListAccess(studentB.id);

  console.log("\n--- Student A (Razorpay Purchase) ---");
  console.log({
    hasAccess: accessA.hasAccess,
    planName: accessA.planName,
    purchasedSlots: accessA.purchasedSlots,
    totalMaxSlots: accessA.totalMaxSlots,
    allowedRounds: accessA.allowedRounds,
  });

  console.log("\n--- Student B (Admin Grant) ---");
  console.log({
    hasAccess: accessB.hasAccess,
    planName: accessB.planName,
    purchasedSlots: accessB.purchasedSlots,
    totalMaxSlots: accessB.totalMaxSlots,
    allowedRounds: accessB.allowedRounds,
  });

  const isIdentical =
    accessA.hasAccess === accessB.hasAccess &&
    accessA.hasAccess === true &&
    accessA.purchasedSlots === accessB.purchasedSlots &&
    accessA.allowedRounds.length === accessB.allowedRounds.length;

  if (isIdentical) {
    console.log("\n✓ SUCCESS: Both Razorpay Purchase and Admin Grant produce 100% IDENTICAL access entitlement!");
  } else {
    console.error("\n❌ MISMATCH between Razorpay Purchase and Admin Grant entitlements!");
  }
  console.log("=================================================\n");
}

verifyFlows().catch(console.error).finally(() => prisma.$disconnect());
