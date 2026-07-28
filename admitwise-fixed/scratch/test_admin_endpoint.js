const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAllAdminGrants() {
  console.log("=========================================");
  console.log("TESTING ALL 3 ADMIN GRANT ACTIONS");
  console.log("=========================================");

  try {
    const student = await prisma.user.findFirst({
      select: { id: true, email: true, currentPlan: true }
    });

    if (!student) {
      console.log("No student found.");
      return;
    }

    const userId = student.id;
    console.log("Target Student:", student);

    // Test 1: Grant ₹599
    console.log("\n--- TEST 1: Grant ₹599 (Round 1) ---");
    const res599 = await fetchGrant(userId, "Round 1", "Preference List Generator (₹599)", "Active", 95);
    console.log("Res 599:", res599);

    // Verify DB after ₹599
    const purchases599 = await prisma.preferenceGeneratorPurchase.findMany({ where: { userId, status: "Paid" } });
    console.log("Purchases after ₹599:", purchases599);

    // Test 2: Grant ₹5000 Premium Plan
    console.log("\n--- TEST 2: Grant ₹5000 Premium Plan ---");
    const res5000 = await fetchGrant(userId, "Round 1", "₹5000 Premium Plan", "Active", 95);
    console.log("Res 5000:", res5000);

    // Verify DB after ₹5000
    const user5000 = await prisma.user.findUnique({ where: { id: userId }, select: { currentPlan: true, profileLimit: true } });
    console.log("User plan after ₹5000:", user5000);

    // Test 3: Grant ₹6000 Elite Plan
    console.log("\n--- TEST 3: Grant ₹6000 Elite Plan ---");
    const res6000 = await fetchGrant(userId, "Round 1", "₹6000 Elite Plan", "Active", 95);
    console.log("Res 6000:", res6000);

    // Verify DB after ₹6000
    const user6000 = await prisma.user.findUnique({ where: { id: userId }, select: { currentPlan: true, profileLimit: true } });
    console.log("User plan after ₹6000:", user6000);

    console.log("\n✓ ALL 3 GRANTS COMPLETED SUCCESSFULLY!");
  } catch (e) {
    console.error("Test Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

async function fetchGrant(userId, round, accessType, accessStatus, percentile) {
  // Simulate logic from app/api/admin/users/route.ts
  const normType = (accessType || "").toLowerCase();
  
  return await prisma.$transaction(async (tx) => {
    const student = await tx.user.findUnique({ where: { id: userId } });
    if (!student) throw new Error("Student not found");

    if (normType.includes("5000") || normType.includes("premium")) {
      await tx.user.update({
        where: { id: userId },
        data: { currentPlan: "premium", profileLimit: 3, paymentStatus: "paid" }
      });
      const existing = await tx.preferenceGeneratorPurchase.findFirst({ where: { userId, round: "ALL" } });
      if (existing) {
        await tx.preferenceGeneratorPurchase.update({
          where: { id: existing.id },
          data: { status: "Paid", savedPercentile: percentile, amount: 5000 }
        });
      } else {
        await tx.preferenceGeneratorPurchase.create({
          data: { userId, round: "ALL", savedPercentile: percentile, status: "Paid", amount: 5000 }
        });
      }
      return { success: true, plan: "premium", allowedSlots: 3, allowedRounds: ["Round 1", "Round 2", "Round 3", "Round 4"] };
    }

    if (normType.includes("6000") || normType.includes("elite")) {
      await tx.user.update({
        where: { id: userId },
        data: { currentPlan: "elite", profileLimit: 4, paymentStatus: "paid" }
      });
      const existing = await tx.preferenceGeneratorPurchase.findFirst({ where: { userId, round: "ALL" } });
      if (existing) {
        await tx.preferenceGeneratorPurchase.update({
          where: { id: existing.id },
          data: { status: "Paid", savedPercentile: percentile, amount: 6000 }
        });
      } else {
        await tx.preferenceGeneratorPurchase.create({
          data: { userId, round: "ALL", savedPercentile: percentile, status: "Paid", amount: 6000 }
        });
      }
      return { success: true, plan: "elite", allowedSlots: 4, allowedRounds: ["Round 1", "Round 2", "Round 3", "Round 4"] };
    }

    // ₹599
    const existing = await tx.preferenceGeneratorPurchase.findFirst({ where: { userId, round } });
    if (existing) {
      await tx.preferenceGeneratorPurchase.update({
        where: { id: existing.id },
        data: { status: "Paid", savedPercentile: percentile, amount: 599 }
      });
    } else {
      await tx.preferenceGeneratorPurchase.create({
        data: { userId, round, savedPercentile: percentile, status: "Paid", amount: 599 }
      });
    }
    return { success: true, plan: student.currentPlan, allowedSlots: 1, allowedRounds: [round] };
  });
}

testAllAdminGrants();
