import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { sendMail } from "@/lib/email"
import { getAdminSession } from "@/lib/admin-auth"

async function checkAdminRole() {
  const allowedRoles = ["Super Admin", "Manager", "Support Executive", "Counsellor"]

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
      console.warn(`[Admin Auth Failure] /api/contact/[id]: Role '${adminSession.role}' for user '${adminSession.email}' is not in allowed roles:`, allowedRoles)
    }
  }

  // 2. Fallback to NextAuth session
  const session = (await getServerSession(authOptions)) as CustomSession | null
  if (session && session.user) {
    if (allowedRoles.includes(session.user.role)) {
      return session
    } else {
      console.warn(`[Admin Auth Failure] /api/contact/[id]: NextAuth Role '${session.user.role}' for user '${session.user.email}' is not in allowed roles:`, allowedRoles)
    }
  }

  if (!adminSession && !session) {
    console.warn("[Admin Auth Failure] /api/contact/[id]: No active custom admin session or NextAuth session found.")
  }

  return null
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { action, replyMessage } = await req.json()

    const message = await db.contactMessage.findUnique({
      where: { id },
    })

    if (!message) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 })
    }

    if (action === "resolve") {
      await db.contactMessage.update({
        where: { id },
        data: { status: "Resolved" },
      })

      // Log activity
      await db.activityLog.create({
        data: {
          userId: session.user.id,
          action: "CONTACT_RESOLVE",
          details: `Marked inquiry from ${message.email} (ID: ${id}) as Resolved`,
        },
      })

      return NextResponse.json({ success: true, message: "Inquiry marked as resolved" })
    }

    if (action === "reply") {
      if (!replyMessage || replyMessage.trim().length === 0) {
        return NextResponse.json({ error: "Reply message cannot be empty" }, { status: 400 })
      }

      // Update in DB
      await db.contactMessage.update({
        where: { id },
        data: {
          status: "Resolved", // A replied message is resolved
          replyMessage: replyMessage,
        },
      })

      // Send reply email to student
      await sendMail({
        to: message.email,
        subject: `Re: [AdmitWise Support] ${message.subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #0c1844;">Dear ${message.name},</h2>
            <p>Thank you for writing to AdmitWise support. Here is our response to your inquiry regarding <strong>"${message.subject}"</strong>:</p>
            
            <div style="background: #f5f5f5; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 4px; font-style: italic;">
              ${replyMessage.replace(/\n/g, "<br/>")}
            </div>

            <p style="margin-top: 25px; color: #555;">Original Inquiry:</p>
            <blockquote style="color: #777; border-left: 2px solid #ccc; padding-left: 10px; margin-left: 5px;">${message.message}</blockquote>

            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
            <p style="font-size: 11px; color: #999;">AdmitWise Counselling & Support Services Team<br/>Pune, India</p>
          </div>
        `,
      })

      // Log activity
      await db.activityLog.create({
        data: {
          userId: session.user.id,
          action: "CONTACT_REPLY",
          details: `Sent email reply to inquiry from ${message.email} (ID: ${id})`,
        },
      })

      return NextResponse.json({ success: true, message: "Reply sent and marked as resolved" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in /api/contact/[id] PATCH:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const message = await db.contactMessage.findUnique({
      where: { id },
    })

    if (!message) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 })
    }

    await db.contactMessage.delete({
      where: { id },
    })

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CONTACT_DELETE",
        details: `Deleted contact inquiry from ${message.email} (ID: ${id})`,
      },
    })

    return NextResponse.json({ success: true, message: "Inquiry deleted successfully" })
  } catch (error) {
    console.error("Error in /api/contact/[id] DELETE:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
