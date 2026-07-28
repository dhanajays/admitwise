const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPlans() {
  const plans = await prisma.plan.findMany();
  console.log("Plans in DB:", plans);
}

checkPlans().catch(console.error).finally(() => prisma.$disconnect());
