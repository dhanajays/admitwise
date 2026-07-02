"use client"

import { useState } from "react"
import {
  Users,
  CreditCard,
  TrendingUp,
  Sparkles,
  BookOpen,
  Mail,
  Activity,
  Calendar,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts"

interface DashboardProps {
  kpis: {
    totalUsers: number
    totalPaidUsers: number
    freeUsers: number
    totalRevenue: number
    monthlyRevenue: number
    todayRevenue: number
    predictionCount: number
    savedProfiles: number
    contactRequests: number
  }
  recentPayments: any[]
  recentLogs: any[]
  chartData: any[]
  topBranches: any[]
  plansPurchased: any[]
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

const COLORS = ["#0c1844", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"]

export function DashboardOverviewClient({
  kpis,
  recentPayments,
  recentLogs,
  chartData,
  topBranches,
  plansPurchased,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"time" | "dist">("time")

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time metrics, analytics trends, and system status logs.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* User stats */}
        <Card
          title="Total Registered Students"
          value={kpis.totalUsers}
          description={`${kpis.totalPaidUsers} Paid · ${kpis.freeUsers} Free`}
          icon={Users}
          color="blue"
        />
        <Card
          title="Total Revenue Generated"
          value={formatINR(kpis.totalRevenue)}
          description={`Month: ${formatINR(kpis.monthlyRevenue)} · Today: ${formatINR(kpis.todayRevenue)}`}
          icon={CreditCard}
          color="green"
        />
        <Card
          title="Predictions Executed"
          value={kpis.predictionCount}
          description={`${kpis.savedProfiles} unique saved profiles`}
          icon={Sparkles}
          color="purple"
        />
      </div>

      {/* Charts section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4 mb-6">
          <h2 className="font-heading text-base font-semibold text-foreground">Analytics Trends</h2>
          <div className="flex rounded-lg bg-secondary/50 p-1">
            <button
              onClick={() => setActiveTab("time")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "time" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              30-Day Activity History
            </button>
            <button
              onClick={() => setActiveTab("dist")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "dist" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Popular Branches & Plans
            </button>
          </div>
        </div>

        {activeTab === "time" ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily Registrations</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="regColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                    <XAxis dataKey="date" stroke="#999" fontSize={10} tickLine={false} />
                    <YAxis stroke="#999" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="registrations" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#regColor)" name="Students" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily Revenue (INR)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="revColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                    <XAxis dataKey="date" stroke="#999" fontSize={10} tickLine={false} />
                    <YAxis stroke="#999" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => `₹${value}`} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#revColor)" name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily Predictions Run</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="predColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                    <XAxis dataKey="date" stroke="#999" fontSize={10} tickLine={false} />
                    <YAxis stroke="#999" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="predictions" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#predColor)" name="Predictions" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Top Preferred Engineering Branches</h3>
              <div className="h-64 w-full">
                {topBranches.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No prediction history recorded yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topBranches} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eaeaea" />
                      <XAxis type="number" stroke="#999" fontSize={10} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#999" fontSize={10} width={120} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0c1844" radius={[0, 4, 4, 0]} name="Predictions">
                        {topBranches.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subscription Purchases Breakdown</h3>
              <div className="h-64 w-full flex items-center justify-center">
                {plansPurchased.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No payment records to display</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={plansPurchased}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      >
                        {plansPurchased.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lists section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent payments table */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-heading text-base font-semibold text-foreground mb-4">Recent Payments</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">No payments found.</td>
                  </tr>
                ) : (
                  recentPayments.map((p) => (
                    <tr key={p.id} className="text-foreground">
                      <td className="py-3.5">
                        <p className="font-semibold">{p.user?.name || "Student"}</p>
                        <p className="text-xs text-muted-foreground">{p.user?.email || "—"}</p>
                      </td>
                      <td className="py-3.5 font-medium">{formatINR(p.amount)}</td>
                      <td className="py-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xxs font-semibold uppercase ${
                            p.status === "Success"
                              ? "bg-green-100 text-green-700"
                              : p.status === "Pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit/Activity feed */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-heading text-base font-semibold text-foreground mb-4">System Activity Feed</h2>
          <div className="space-y-4">
            {recentLogs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity logged.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 rounded bg-secondary p-1 text-muted-foreground">
                    <Activity className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1 space-y-0.5">
                    <p className="font-medium text-foreground">
                      {log.action} <span className="font-normal text-muted-foreground">by</span>{" "}
                      {log.user?.name || "System"}
                    </p>
                    <p className="text-xs text-muted-foreground">{log.details}</p>
                  </div>
                  <span className="text-xxs text-muted-foreground shrink-0 mt-0.5">
                    {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  description: string
  icon: any
  color: "blue" | "green" | "purple"
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-start justify-between gap-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <h3 className="font-heading text-3xl font-extrabold text-foreground">{value}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span
        className={`rounded-xl p-3 ${
          color === "blue" ? "bg-blue-50 text-blue-600" : color === "green" ? "bg-green-50 text-green-600" : "bg-purple-50 text-purple-600"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
    </div>
  )
}
