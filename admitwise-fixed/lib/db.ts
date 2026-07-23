import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

declare global {
  var prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      "[db] DATABASE_URL is not defined. Check your .env file or deployment environment variables."
    )
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    return createPrismaClient()
  }

  // In development, reuse the cached singleton across HMR reloads
  if (!globalThis.prisma || !("preferenceGeneratorPurchase" in globalThis.prisma)) {
    globalThis.prisma = createPrismaClient()
  }

  return globalThis.prisma
}

export const db = getPrismaClient()
export default db

