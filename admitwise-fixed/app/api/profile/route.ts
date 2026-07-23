import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getPreferenceListAccess } from "@/lib/payments"
import { z } from "zod"

const profileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  mobile: z
    .string()
    .regex(/^\d{10}$/, "Mobile must be a 10-digit number")
    .optional()
    .nullable(),
  category: z
    .enum(["Open", "OBC", "SC", "ST", "VJ-NT", "NT-B", "NT-C", "NT-D", "SBC", "EWS"])
    .optional()
    .nullable(),
  gender: z.enum(["Male", "Female", "Other"]).optional().nullable(),
  homeUniversity: z.string().max(200).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(), // ISO date string
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      image: true,
      category: true,
      gender: true,
      homeUniversity: true,
      dateOfBirth: true,
      currentPlan: true,
      paymentStatus: true,
      createdAt: true,
      isFirstGoogleSignup: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const access = await getPreferenceListAccess(user.id)

  return NextResponse.json({
    ...user,
    preferenceAccess: access,
  })
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = profileUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { name, mobile, category, gender, homeUniversity, dateOfBirth } = parsed.data

  // Check mobile uniqueness if updating
  if (mobile) {
    const existing = await db.user.findFirst({
      where: { mobile, NOT: { email: session.user.email } },
    })
    if (existing) {
      return NextResponse.json({ error: "Mobile number already in use" }, { status: 409 })
    }
  }

  const updated = await db.user.update({
    where: { email: session.user.email },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(mobile !== undefined ? { mobile } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(gender !== undefined ? { gender } : {}),
      ...(homeUniversity !== undefined ? { homeUniversity } : {}),
      ...(dateOfBirth !== undefined
        ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      image: true,
      category: true,
      gender: true,
      homeUniversity: true,
      dateOfBirth: true,
    },
  })

  return NextResponse.json({ success: true, user: updated })
}
