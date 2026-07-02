import { NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-auth"
import { db } from "@/lib/db"
import * as bcrypt from "bcryptjs"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional()
    .nullable(),
  email: z.string().email("Invalid email address").optional(),
  mobile: z
    .string()
    .regex(/^\d{10}$/, "Mobile must be a 10-digit number")
    .optional()
    .nullable(),
  image: z.string().optional().nullable(), // base64 or URL
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
})

export async function GET() {
  try {
    const adminSession = await getAdminSession()
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await db.user.findUnique({
      where: { id: adminSession.userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        mobile: true,
        image: true,
        createdAt: true,
        lastLogin: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!admin) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 })
    }

    return NextResponse.json({
      ...admin,
      role: admin.role?.name || "Admin",
    })
  } catch (error) {
    console.error("GET /api/admin/profile error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const adminSession = await getAdminSession()
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const {
      name,
      username,
      email,
      mobile,
      image,
      currentPassword,
      newPassword,
      confirmPassword,
    } = parsed.data

    // Fetch current user from database
    const user = await db.user.findUnique({
      where: { id: adminSession.userId },
    })

    if (!user) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 })
    }

    // ── Validation Checks ────────────────────────────────────────────────────
    // 1. Check unique Username
    if (username) {
      const existingUser = await db.user.findFirst({
        where: { username, NOT: { id: user.id } },
      })
      if (existingUser) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 })
      }
    }

    // 2. Check unique Email
    if (email) {
      const existingEmail = await db.user.findFirst({
        where: { email, NOT: { id: user.id } },
      })
      if (existingEmail) {
        return NextResponse.json({ error: "Email address is already in use" }, { status: 409 })
      }
    }

    // 3. Check unique Mobile Number
    if (mobile) {
      const existingMobile = await db.user.findFirst({
        where: { mobile, NOT: { id: user.id } },
      })
      if (existingMobile) {
        return NextResponse.json({ error: "Mobile number is already in use" }, { status: 409 })
      }
    }

    // 4. Secure Password Update Logic
    let passwordHashUpdate: string | undefined = undefined
    if (newPassword || currentPassword || confirmPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return NextResponse.json(
          { error: "Current password, new password, and confirm password are all required to change password" },
          { status: 400 }
        )
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json({ error: "New passwords do not match" }, { status: 400 })
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: "New password must be at least 6 characters long" }, { status: 400 })
      }

      if (!user.passwordHash) {
        return NextResponse.json({ error: "Cannot change password on this account type" }, { status: 400 })
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isValidPassword) {
        return NextResponse.json({ error: "Incorrect current password" }, { status: 401 })
      }

      passwordHashUpdate = await bcrypt.hash(newPassword, 10)
    }

    // ── Update Database ──────────────────────────────────────────────────────
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(username !== undefined ? { username } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(mobile !== undefined ? { mobile } : {}),
        ...(image !== undefined ? { image } : {}),
        ...(passwordHashUpdate !== undefined ? { passwordHash: passwordHashUpdate } : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        mobile: true,
        image: true,
        createdAt: true,
        lastLogin: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    })

    // Log Activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "ADMIN_PROFILE_UPDATE",
        details: `Admin profile updated: ${updatedUser.email}. Name: ${updatedUser.name}, Username: ${updatedUser.username}`,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        role: updatedUser.role?.name || "Admin",
      },
    })
  } catch (error) {
    console.error("PUT /api/admin/profile error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
