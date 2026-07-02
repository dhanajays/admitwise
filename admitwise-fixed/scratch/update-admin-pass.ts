import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import * as bcrypt from "bcryptjs"

const connectionString = process.env.DATABASE_URL!
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function run() {
  try {
    const passwordHash = await bcrypt.hash("adminpassword", 10)
    await prisma.user.update({
      where: { email: "dhanusarkate1070@gmail.com" },
      data: { passwordHash },
    })
    console.log("Super Admin password updated successfully.")
  } catch (err) {
    console.error("Prisma update failed:", err)
  } finally {
    await prisma.$disconnect()
  }
}

run()
