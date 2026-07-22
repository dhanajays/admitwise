import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

declare global {
  var prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    return new PrismaClient({ adapter })
  }

  // In development, ensure cached client has all latest models
  if (!globalThis.prisma || !("preferenceGeneratorPurchase" in globalThis.prisma)) {
    globalThis.prisma = new PrismaClient({ adapter })
  }

  return globalThis.prisma
}

export const db = getPrismaClient()
export default db
