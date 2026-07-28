const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGetUsers() {
  console.log("Testing GET students query...");
  const students = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      role: true,
      predictionProfiles: true,
      preferenceGeneratorPurchases: true,
      preferenceSavedPercentiles: true,
    },
  });

  console.log(`Loaded ${students.length} students successfully.`);

  const formatted = students.map((u) => {
    const currentPlan = (u.currentPlan || "free").toLowerCase();
    const isFullPlan = currentPlan === "premium" || currentPlan === "elite";
    const includedSlots = currentPlan === "premium" ? 3 : currentPlan === "elite" ? 4 : 0;

    const purchases = Array.isArray(u.preferenceGeneratorPurchases) ? u.preferenceGeneratorPurchases : [];
    const paidPurchases = purchases.filter((p) => (p.status || "").toLowerCase() === "paid");

    const purchasedSlots = isFullPlan
      ? paidPurchases.filter((p) => p.amount === 599).length
      : paidPurchases.length;

    const totalMaxSlots = isFullPlan ? includedSlots + purchasedSlots : Math.max(purchasedSlots, 0);
    const usedSlots = Array.isArray(u.preferenceSavedPercentiles) ? u.preferenceSavedPercentiles.length : 0;
    const hasAccess = isFullPlan || paidPurchases.length > 0 || totalMaxSlots > 0;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      currentPlan: u.currentPlan,
      hasPreferenceAccess: hasAccess,
      preferenceTotalSlots: totalMaxSlots,
      preferenceUsedSlots: usedSlots,
    };
  });

  console.log("Formatted Sample (First 3):", formatted.slice(0, 3));
  console.log("✓ SUCCESS: All students formatted without errors.");
}

testGetUsers().catch(console.error).finally(() => prisma.$disconnect());
