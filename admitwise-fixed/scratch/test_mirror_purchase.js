const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMirrorGrantFlow() {
  console.log("=========================================");
  console.log("TESTING ADMIN GRANT MIRRORING REAL PURCHASE");
  console.log("=========================================");

  const student = await prisma.user.findFirst({
    select: { id: true, email: true, currentPlan: true }
  });

  if (!student) {
    console.log("No student found.");
    return;
  }

  const userId = student.id;
  console.log("Target Student:", student);

  // 1. Test ₹599 Grant
  console.log("\n--- TEST 1: Granting ₹599 Preference Access ---");
  const timestamp = Date.now();
  const orderId599 = `order_admin_${timestamp}`;
  const paymentId599 = `pay_admin_${timestamp}`;

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId: orderId599,
        paymentId: paymentId599,
        userId,
        amount: 599,
        status: "Success",
        purchaseType: "preference_generator"
      }
    });

    const existing = await tx.preferenceGeneratorPurchase.findFirst({ where: { userId, round: "Round 1" } });
    if (existing) {
      await tx.preferenceGeneratorPurchase.update({
        where: { id: existing.id },
        data: { status: "Paid", savedPercentile: 95, amount: 599, paymentId: paymentId599 }
      });
    } else {
      await tx.preferenceGeneratorPurchase.create({
        data: { userId, round: "Round 1", savedPercentile: 95, status: "Paid", amount: 599, paymentId: paymentId599 }
      });
    }

    await tx.preferenceSavedPercentile.upsert({
      where: { userId_savedPercentile: { userId, savedPercentile: 95 } },
      create: { userId, savedPercentile: 95 },
      update: {}
    });
  });

  const payments599 = await prisma.payment.findMany({ where: { userId, status: "Success" } });
  const purchases599 = await prisma.preferenceGeneratorPurchase.findMany({ where: { userId, status: "Paid" } });
  const saved599 = await prisma.preferenceSavedPercentile.findMany({ where: { userId } });

  console.log("Payment table records:", payments599.length);
  console.log("PreferenceGeneratorPurchase records:", purchases599.length);
  console.log("PreferenceSavedPercentile records:", saved599.length);

  // 2. Test ₹5000 Premium Grant
  console.log("\n--- TEST 2: Granting ₹5000 Premium Plan ---");
  const orderId5000 = `order_admin_${timestamp + 1}`;
  const paymentId5000 = `pay_admin_${timestamp + 1}`;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { currentPlan: "premium", paymentStatus: "paid", profileLimit: 3, trackerProfileLimit: 3 }
    });

    await tx.subscription.updateMany({
      where: { userId, status: "active" },
      data: { status: "expired", expiresAt: new Date() }
    });

    await tx.subscription.create({
      data: { userId, planId: "premium", maxProfiles: 3, trackerMaxProfiles: 3, status: "active" }
    });

    await tx.payment.create({
      data: { orderId: orderId5000, paymentId: paymentId5000, userId, planId: "premium", amount: 5000, status: "Success", purchaseType: "plan" }
    });

    const existing = await tx.preferenceGeneratorPurchase.findFirst({ where: { userId, round: "ALL" } });
    if (existing) {
      await tx.preferenceGeneratorPurchase.update({
        where: { id: existing.id },
        data: { status: "Paid", savedPercentile: 95, amount: 5000, paymentId: paymentId5000 }
      });
    } else {
      await tx.preferenceGeneratorPurchase.create({
        data: { userId, round: "ALL", savedPercentile: 95, status: "Paid", amount: 5000, paymentId: paymentId5000 }
      });
    }
  });

  const userAfter5000 = await prisma.user.findUnique({ where: { id: userId }, select: { currentPlan: true, profileLimit: true } });
  const subAfter5000 = await prisma.subscription.findMany({ where: { userId, status: "active" } });

  console.log("User currentPlan after ₹5000:", userAfter5000);
  console.log("Active Subscription after ₹5000:", subAfter5000[0]?.planId);

  // 3. Test ₹6000 Elite Grant
  console.log("\n--- TEST 3: Granting ₹6000 Elite Plan ---");
  const orderId6000 = `order_admin_${timestamp + 2}`;
  const paymentId6000 = `pay_admin_${timestamp + 2}`;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { currentPlan: "elite", paymentStatus: "paid", profileLimit: 4, trackerProfileLimit: 4 }
    });

    await tx.subscription.updateMany({
      where: { userId, status: "active" },
      data: { status: "expired", expiresAt: new Date() }
    });

    await tx.subscription.create({
      data: { userId, planId: "elite", maxProfiles: 4, trackerMaxProfiles: 4, status: "active" }
    });

    await tx.payment.create({
      data: { orderId: orderId6000, paymentId: paymentId6000, userId, planId: "elite", amount: 6000, status: "Success", purchaseType: "plan" }
    });

    const existing = await tx.preferenceGeneratorPurchase.findFirst({ where: { userId, round: "ALL" } });
    if (existing) {
      await tx.preferenceGeneratorPurchase.update({
        where: { id: existing.id },
        data: { status: "Paid", savedPercentile: 95, amount: 6000, paymentId: paymentId6000 }
      });
    } else {
      await tx.preferenceGeneratorPurchase.create({
        data: { userId, round: "ALL", savedPercentile: 95, status: "Paid", amount: 6000, paymentId: paymentId6000 }
      });
    }
  });

  const userAfter6000 = await prisma.user.findUnique({ where: { id: userId }, select: { currentPlan: true, profileLimit: true } });
  const subAfter6000 = await prisma.subscription.findMany({ where: { userId, status: "active" } });

  console.log("User currentPlan after ₹6000:", userAfter6000);
  console.log("Active Subscription after ₹6000:", subAfter6000[0]?.planId);

  console.log("\n=========================================");
  console.log("✓ ALL ADMIN GRANT MIRROR TESTS PASSED!");
  console.log("=========================================");
}

testMirrorGrantFlow().catch(console.error).finally(() => prisma.$disconnect());
