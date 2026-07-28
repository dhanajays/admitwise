const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

async function main() {
  console.log("=========================================");
  console.log("TESTING ADMIN GRANT PREFERENCE ACCESS");
  console.log("=========================================");

  try {
    // 1. Fetch first student user
    const student = await prisma.user.findFirst({
      where: {
        email: { not: undefined }
      },
      select: { id: true, email: true, currentPlan: true }
    });

    if (!student) {
      console.log("No student user found in database!");
      return;
    }

    console.log("Found Student:", student);

    const userId = student.id;
    const round = "Round 1";
    const accessStatus = "Active";
    const accessType = "Preference List Generator (₹599)";
    const percentile = 95;

    console.log("\nExecuting Admin Grant Transaction...");

    const result = await prisma.$transaction(async (tx) => {
      console.log("Step 1: Loading student in tx...");
      const s = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, currentPlan: true }
      });
      console.log("✓ Student loaded:", s.email);

      console.log("Step 2: Checking existing purchase...");
      const existingPurchase = await tx.preferenceGeneratorPurchase.findFirst({
        where: { userId, round }
      });
      console.log("Existing purchase:", existingPurchase);

      if (existingPurchase) {
        console.log("Updating existing purchase record...");
        await tx.preferenceGeneratorPurchase.update({
          where: { id: existingPurchase.id },
          data: {
            status: "Paid",
            savedPercentile: percentile,
            amount: 599,
            paymentId: "admin_manual"
          }
        });
      } else {
        console.log("Creating new purchase record...");
        await tx.preferenceGeneratorPurchase.create({
          data: {
            userId,
            round,
            savedPercentile: percentile,
            status: "Paid",
            amount: 599,
            paymentId: "admin_manual"
          }
        });
      }

      console.log("Step 3: Upserting saved percentile profile...");
      await tx.preferenceSavedPercentile.upsert({
        where: {
          userId_savedPercentile: { userId, savedPercentile: percentile }
        },
        create: { userId, savedPercentile: percentile },
        update: {}
      });

      console.log("✓ All transaction steps completed successfully!");
      return { success: true };
    });

    console.log("Result:", result);
  } catch (err) {
    console.error("=========================================");
    console.error("❌ FAILED WITH EXCEPTION:");
    console.error("Error Name:", err.name);
    console.error("Error Message:", err.message);
    console.error("Prisma Code:", err.code);
    console.error("Meta:", err.meta);
    console.error("Stack:", err.stack);
    console.error("=========================================");
  } finally {
    await prisma.$disconnect();
  }
}

main();
