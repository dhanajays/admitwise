import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import {
  authenticateAdmin,
  signAdminToken,
  ADMIN_COOKIE_NAME,
  getAdminCookieOptions,
} from "@/lib/admin-auth"
import { db } from "@/lib/db"

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = loginSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid credentials format" },
        { status: 400 }
      )
    }

    const { email, password } = result.data
    const adminPayload = await authenticateAdmin(email, password)

    if (!adminPayload) {
      return NextResponse.json(
        { error: "Invalid credentials or insufficient permissions" },
        { status: 401 }
      )
    }

    const token = signAdminToken(adminPayload)
    const cookieStore = await cookies()
    cookieStore.set(ADMIN_COOKIE_NAME, token, getAdminCookieOptions())

    // Log the admin login
    await db.activityLog.create({
      data: {
        userId: adminPayload.userId,
        action: "ADMIN_LOGIN",
        details: `Admin login: ${adminPayload.email} (${adminPayload.role})`,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        name: adminPayload.name,
        email: adminPayload.email,
        role: adminPayload.role,
      },
    })
  } catch (error) {
    console.error("Admin login error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE() {
  // Admin Logout — clear the cookie
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    ...getAdminCookieOptions(),
    maxAge: 0,
  })
  return NextResponse.json({ success: true, message: "Logged out" })
}

