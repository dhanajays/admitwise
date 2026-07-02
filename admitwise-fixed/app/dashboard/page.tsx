import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { DashboardClient } from "@/components/plans/dashboard-client"

export const metadata = {
  title: "My Plan — AdmitWise",
  description:
    "View your current AdmitWise plan, manage your percentile profiles, and add more profiles.",
}

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="flex-1 bg-white">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-slate-200/50 bg-[#f8fafc] py-12">
          <div className="pointer-events-none absolute left-0 top-0 h-[200px] w-[350px] rounded-full bg-blue-500/5 filter blur-[100px]" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="font-heading text-3xl font-bold text-slate-900">My Plan</h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage your subscription and percentile profiles.
            </p>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <DashboardClient />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
