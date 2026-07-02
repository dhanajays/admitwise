import { getAdminSession } from "@/lib/admin-auth"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

async function checkAdminRole() {
  const session = await getAdminSession()
  if (!session) return null
  const allowedRoles = ["Super Admin", "Manager", "Support Executive", "Counsellor"]
  if (!allowedRoles.includes(session.role)) return null
  return session
}

export async function GET() {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ── 1. KPI Aggregations ──────────────────────────────────────────────────
    const totalUsers = await db.user.count()

    const totalPaidUsers = await db.user.count({
      where: {
        paymentStatus: "paid",
        currentPlan: { in: ["single", "premium", "elite"] },
      },
    })

    const freeUsers = totalUsers - totalPaidUsers

    // Revenue aggregations
    const payments = await db.payment.findMany({
      where: { status: "Success" },
      select: { amount: true, createdAt: true },
    })

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const monthlyRevenue = payments
      .filter((p) => p.createdAt >= startOfMonth)
      .reduce((sum, p) => sum + p.amount, 0)

    const todayRevenue = payments
      .filter((p) => p.createdAt >= startOfToday)
      .reduce((sum, p) => sum + p.amount, 0)

    // Counters
    const predictionCount = await db.predictionHistory.count()
    const savedProfiles = await db.predictionProfile.count()
    const contactRequests = await db.contactMessage.count()

    // Recent Payments
    const recentPayments = await db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    })

    // Recent Activity Logs (representing recent logins or actions)
    const recentLogs = await db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    })

    // Active Plan distribution
    const plansDistribution = await db.user.groupBy({
      by: ["currentPlan"],
      _count: true,
    })

    const activePlans = plansDistribution.map((item) => ({
      name: item.currentPlan || "free",
      count: item._count,
    }))

    // ── 2. Time-series chart aggregations (Last 30 Days) ─────────────────────
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Registrations over 30 days
    const usersCreated = await db.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    })

    // Predictions over 30 days
    const predictionsCreated = await db.predictionHistory.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    })

    // Generate daily dates array
    const dailyStats: Record<string, { date: string; registrations: number; revenue: number; predictions: number }> = {}
    for (let i = 0; i < 30; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateKey = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      dailyStats[dateKey] = { date: dateKey, registrations: 0, revenue: 0, predictions: 0 }
    }

    // Fill signups
    usersCreated.forEach((u) => {
      const dateKey = u.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      if (dailyStats[dateKey]) {
        dailyStats[dateKey].registrations++
      }
    })

    // Fill predictions
    predictionsCreated.forEach((p) => {
      const dateKey = p.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      if (dailyStats[dateKey]) {
        dailyStats[dateKey].predictions++
      }
    })

    // Fill payments
    payments
      .filter((p) => p.createdAt >= thirtyDaysAgo)
      .forEach((p) => {
        const dateKey = p.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
        if (dailyStats[dateKey]) {
          dailyStats[dateKey].revenue += p.amount
        }
      })

    const chartData = Object.values(dailyStats).reverse()

    // ── 3. Distribution metrics for tables/piecharts ────────────────────────
    // Top branches predicted
    const topBranches = await db.predictionHistory.groupBy({
      by: ["branch"],
      _count: true,
      orderBy: { _count: { branch: "desc" } }, // Wait! Prisma ordering in groupBy: use {_count: {branch: 'desc'}} or {_count: 'desc'}
      // Wait, to bypass order syntax issues: we can order on JS array after fetching!
      take: 10,
    })
    
    // Top branches sorted manually for safety against prisma groupBy version differences
    const sortedBranches = topBranches
      .map((b) => ({ name: b.branch, count: b._count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Most purchased plans (successful payments grouped by plan)
    const planPayments = await db.payment.groupBy({
      by: ["purchaseType", "amount"],
      where: { status: "Success" },
      _count: true,
    })

    const plansPurchased = planPayments.map((p) => {
      let name = p.purchaseType === "addon" ? "Addon (+1 profile)" : "Single Predictor"
      if (p.purchaseType === "plan" && p.amount === 5000) name = "Premium CAP Support"
      if (p.purchaseType === "plan" && p.amount === 6000) name = "Elite Admission Support"
      return {
        name,
        value: p._count,
      }
    })

    return NextResponse.json({
      kpis: {
        totalUsers,
        totalPaidUsers,
        freeUsers,
        totalRevenue,
        monthlyRevenue,
        todayRevenue,
        predictionCount,
        savedProfiles,
        contactRequests,
      },
      activePlans,
      recentPayments,
      recentLogs,
      chartData,
      topBranches: sortedBranches,
      plansPurchased,
    })
  } catch (error) {
    console.error("Error in /api/admin/analytics GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
