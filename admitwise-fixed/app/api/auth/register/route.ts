import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import * as bcrypt from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  mobile: z.string().regex(/^\d{10}$/, "Mobile must be a 10-digit number"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = registerSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation error", issues: result.error.issues },
        { status: 400 }
      )
    }

    const { name, email, password, mobile } = result.data

    // Check if email already taken
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      )
    }

    // Check if mobile already taken
    if (mobile) {
      const existingMobile = await db.user.findUnique({
        where: { mobile },
      })
      if (existingMobile) {
        return NextResponse.json(
          { error: "A user with this mobile number already exists" },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Find Student role
    const studentRole = await db.role.findUnique({
      where: { name: "Student" },
    })

    // Create User
    const user = await db.user.create({
      data: {
        name,
        email,
        mobile,
        passwordHash: hashedPassword,
        roleId: studentRole?.id,
        currentPlan: "free",
        paymentStatus: "unpaid",
        profileLimit: 0,
        profilesUsed: 0,
      },
    })

    // Log Activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "USER_REGISTER",
        details: `Student registered with email ${email}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: "User registered successfully",
      userId: user.id,
    })
  } catch (error) {
    console.error("Error in /api/auth/register POST:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
