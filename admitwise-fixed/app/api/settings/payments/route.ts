import { NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const setting = await db.websiteSetting.findUnique({
      where: { key: "payment_settings" },
    })

    if (!setting) {
      return NextResponse.json({ paymentsEnabled: true })
    }

    const data = JSON.parse(setting.value)
    return NextResponse.json({ paymentsEnabled: data.paymentsEnabled !== false })
  } catch (error) {
    console.error("GET /api/settings/payments error:", error)
    return NextResponse.json({ paymentsEnabled: true }) // fallback to true
  }
}

export async function POST(req: Request) {
  try {
    const adminSession = await getAdminSession()
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const allowedRoles = ["Super Admin", "Manager"]
    if (!allowedRoles.includes(adminSession.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { paymentsEnabled } = await req.json()

    if (typeof paymentsEnabled !== "boolean") {
      return NextResponse.json({ error: "paymentsEnabled must be a boolean" }, { status: 400 })
    }

    await db.websiteSetting.upsert({
      where: { key: "payment_settings" },
      update: {
        value: JSON.stringify({ paymentsEnabled }),
      },
      create: {
        key: "payment_settings",
        value: JSON.stringify({ paymentsEnabled }),
      },
    })

    // Log Activity
    await db.activityLog.create({
      data: {
        userId: adminSession.userId,
        action: "PAYMENT_SETTINGS_UPDATE",
        details: `Online plan purchases ${paymentsEnabled ? "enabled" : "disabled"}`,
      },
    })

    return NextResponse.json({ success: true, paymentsEnabled })
  } catch (error) {
    console.error("POST /api/settings/payments error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
