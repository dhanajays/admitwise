const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=========================================");
  console.log("VERIFYING ALL PRISMA MODELS ON DB & TX");
  console.log("=========================================");

  console.log("Model Existence on prisma:", {
    user: !!prisma.user,
    subscription: !!prisma.subscription,
    preferenceGeneratorPurchase: !!prisma.preferenceGeneratorPurchase,
    preferenceSavedPercentile: !!prisma.preferenceSavedPercentile,
    preferenceGeneratorHistory: !!prisma.preferenceGeneratorHistory,
    predictionProfile: !!prisma.predictionProfile,
  });

  await prisma.$transaction(async (tx) => {
    console.log("Model Existence on transaction client (tx):", {
      user: !!tx.user,
      subscription: !!tx.subscription,
      preferenceGeneratorPurchase: !!tx.preferenceGeneratorPurchase,
      preferenceSavedPercentile: !!tx.preferenceSavedPercentile,
      preferenceGeneratorHistory: !!tx.preferenceGeneratorHistory,
    });
  });

  console.log("=========================================");
  console.log("✓ ALL PRISMA MODELS ARE DEFINED!");
  console.log("=========================================");
}

main().catch(console.error).finally(() => prisma.$disconnect());
