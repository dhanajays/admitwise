import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { sendMail } from "@/lib/email"
import { z } from "zod"
import { getAdminSession } from "@/lib/admin-auth"

async function checkAdminRole() {
  const allowedRoles = ["Super Admin", "Manager", "Support Executive"]

  // 1. Try custom admin token session first
  const adminSession = await getAdminSession()
  if (adminSession) {
    if (allowedRoles.includes(adminSession.role)) {
      return {
        user: {
          id: adminSession.userId,
          email: adminSession.email,
          name: adminSession.name,
          role: adminSession.role,
        }
      }
    } else {
      console.warn(`[Admin Auth Failure] /api/notifications: Role '${adminSession.role}' for user '${adminSession.email}' is not in allowed roles:`, allowedRoles)
    }
  }

  // 2. Fallback to NextAuth session
  const session = (await getServerSession(authOptions)) as CustomSession | null
  if (session && session.user) {
    if (allowedRoles.includes(session.user.role)) {
      return session
    } else {
      console.warn(`[Admin Auth Failure] /api/notifications: NextAuth Role '${session.user.role}' for user '${session.user.email}' is not in allowed roles:`, allowedRoles)
    }
  }

  if (!adminSession && !session) {
    console.warn("[Admin Auth Failure] /api/notifications: No active custom admin session or NextAuth session found.")
  }

  return null
}

const notificationSchema = z.object({
  userId: z.string().optional(),
  type: z.enum(["Email", "Announcement", "PlanUpdate", "AdmissionUpdate", "Maintenance"]),
  subject: z.string().min(2),
  message: z.string().min(5),
  sendEmail: z.boolean().optional(),
})

export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as CustomSession
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const notifications = await db.notification.findMany({
      where: {
        OR: [{ userId: null }, { userId: session.user.id }],
      },
      orderBy: { sentAt: "desc" },
      take: 100,
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Error in /api/notifications GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await checkAdminRole()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const parsed = notificationSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 400 })
    }

    const notification = await db.notification.create({
      data: {
        ...parsed.data,
        isSent: true,
        sentAt: new Date(),
      },
    })

    if (parsed.data.sendEmail && parsed.data.userId) {
      const user = await db.user.findUnique({ where: { id: parsed.data.userId } })
      if (user?.email) {
        await sendMail({
          to: user.email,
          subject: parsed.data.subject,
          html: `<p>${parsed.data.message.replace(/\n/g, "<br/>")}</p>`,
        })
      }
    }

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "NOTIFICATION_SEND",
        details: `Created ${parsed.data.type} notification: ${parsed.data.subject}`,
      },
    })

    return NextResponse.json({ success: true, notification })
  } catch (error) {
    console.error("Error in /api/notifications POST:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
