import { db } from "@/lib/db"
import { DashboardOverviewClient } from "./dashboard-client"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  // ── 1. Gather KPIs directly from DB ────────────────────────────────────────
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

  // Recent Logs
  const recentLogs = await db.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  })

  // ── 2. Time-series chart aggregates (Last 30 Days) ─────────────────────────
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const usersCreated = await db.user.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true },
  })

  const predictionsCreated = await db.predictionHistory.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true },
  })

  // Generate 30 days calendar daily stats
  const dailyStats: Record<string, { date: string; registrations: number; revenue: number; predictions: number }> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateKey = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    dailyStats[dateKey] = { date: dateKey, registrations: 0, revenue: 0, predictions: 0 }
  }

  // Populate signups
  usersCreated.forEach((u) => {
    const dateKey = u.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    if (dailyStats[dateKey]) {
      dailyStats[dateKey].registrations++
    }
  })

  // Populate predictions
  predictionsCreated.forEach((p) => {
    const dateKey = p.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    if (dailyStats[dateKey]) {
      dailyStats[dateKey].predictions++
    }
  })

  // Populate payments
  payments
    .filter((p) => p.createdAt >= thirtyDaysAgo)
    .forEach((p) => {
      const dateKey = p.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      if (dailyStats[dateKey]) {
        dailyStats[dateKey].revenue += p.amount
      }
    })

  const chartData = Object.values(dailyStats).reverse()

  // ── 3. Top Branches & Most Selected Plans ──────────────────────────────────
  const topBranchesRaw = await db.predictionHistory.groupBy({
    by: ["branch"],
    _count: true,
  })

  const topBranches = topBranchesRaw
    .map((b) => ({ name: b.branch, count: b._count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

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

  // Format data for props
  const kpis = {
    totalUsers,
    totalPaidUsers,
    freeUsers,
    totalRevenue,
    monthlyRevenue,
    todayRevenue,
    predictionCount,
    savedProfiles,
    contactRequests,
  }

  return (
    <DashboardOverviewClient
      kpis={kpis}
      recentPayments={JSON.parse(JSON.stringify(recentPayments))}
      recentLogs={JSON.parse(JSON.stringify(recentLogs))}
      chartData={chartData}
      topBranches={topBranches}
      plansPurchased={plansPurchased}
    />
  )
}
