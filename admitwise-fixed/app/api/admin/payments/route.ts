import { getAdminSession } from "@/lib/admin-auth"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createRazorpayRefund } from "@/lib/razorpay"
import { z } from "zod"

async function checkAdminRole() {
  const session = await getAdminSession()
  if (!session) return null
  return ["Super Admin", "Manager", "Support Executive"].includes(session.role) ? session : null
}

const refundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().positive().optional(),
})

export async function GET(req: Request) {
  try {
    const session = await checkAdminRole()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || undefined
    const purchaseType = searchParams.get("purchaseType") || undefined

    const payments = await db.payment.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(purchaseType ? { purchaseType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, name: true, email: true, mobile: true } },
        plan: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Error in /api/admin/payments GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await checkAdminRole()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const parsed = refundSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 400 })
    }

    const payment = await db.payment.findUnique({ where: { id: parsed.data.paymentId } })
    if (!payment || !payment.paymentId) {
      return NextResponse.json({ error: "Successful gateway payment not found" }, { status: 404 })
    }

    const refund = await createRazorpayRefund(payment.paymentId, parsed.data.amount)

    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "Refunded",
        refundId: refund.id,
        refundedAt: new Date(),
      },
    })

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "PAYMENT_REFUND",
        details: `Refunded payment ${payment.paymentId} for INR ${parsed.data.amount || payment.amount}`,
      },
    })

    return NextResponse.json({ success: true, refund })
  } catch (error) {
    console.error("Error in /api/admin/payments POST:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
