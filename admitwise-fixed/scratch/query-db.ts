import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const connectionString = process.env.DATABASE_URL!
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function run() {
  try {
    const users = await prisma.user.findMany({
      include: { role: true },
    })
    console.log("Total users found in database:", users.length)
    users.forEach((u: any) => {
      console.log(`- Email: ${u.email}, Role: ${u.role?.name}, PasswordHash exists: ${!!u.passwordHash}, Suspended: ${u.isSuspended}`)
    })
  } catch (err) {
    console.error("Prisma query failed:", err)
  } finally {
    await prisma.$disconnect()
  }
}

run()
