import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { userId, phone } = await req.json()

    if (!userId || !phone) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    // Validate phone number format (10-digit check)
    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: "Please enter a valid 10-digit mobile number" }, { status: 400 })
    }

    // Check if phone number is already taken by another user
    const existing = await db.user.findFirst({
      where: {
        mobile: phone,
        NOT: { id: userId },
      },
    })

    if (existing) {
      return NextResponse.json({ error: "Mobile number already in use" }, { status: 409 })
    }

    // Update user in DB
    await db.user.update({
      where: { id: userId },
      data: {
        mobile: phone,
        mobileVerified: true,
        isFirstGoogleSignup: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in /api/user/update-phone:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
