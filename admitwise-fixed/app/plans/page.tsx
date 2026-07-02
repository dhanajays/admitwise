import { Check, Sparkles, Zap } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Reveal } from "@/components/reveal"
import { PLANS } from "@/lib/subscription/types"
import { PlanCard } from "@/components/plans/plan-card"

export const metadata = {
  title: "Plans & Pricing — AdmitWise",
  description:
    "Choose the right AdmitWise plan. Get unlimited college predictions, AI admission analysis, and expert counselling support.",
}

export default function PlansPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1 bg-white">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-slate-200/50 bg-[#f8fafc] py-16">
          {/* Background glow */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/5 filter blur-[100px]" />

          <div className="relative z-10 mx-auto max-w-[1800px] px-6 py-4 text-center sm:px-8">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-3.5 py-1.5 text-xs font-semibold text-blue-650 uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5" /> Transparent pricing
              </span>

              <h1 className="mx-auto mt-5 max-w-2xl text-balance font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl text-gradient">
                Predict smarter. Decide better.
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-sm text-slate-500 leading-relaxed">
                Every plan includes unlimited college predictions. Plans differ
                only in the number of&nbsp;
                <strong className="text-slate-800">Percentile Profiles</strong>{" "}
                you can save and the level of expert support.
              </p>

              {/* What is a Percentile Profile */}
              <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
                <p className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Zap className="h-4 w-4 text-blue-600" />
                  What is a Percentile Profile?
                </p>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  A profile is one unique <strong className="text-slate-800">Exam + Percentile</strong>{" "}
                  combination — e.g.{" "}
                  <span className="rounded-md bg-blue-50 border border-blue-100 px-1.5 py-0.5 font-mono text-blue-700 text-[11px] font-semibold">
                    MHT CET PCM · 98.45
                  </span>
                  . Once saved, you can run unlimited predictions with that
                  profile — changing branch, category, round, etc. — at no extra
                  charge.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Plans grid */}
        <section className="bg-white">
          <div className="mx-auto max-w-[1800px] px-6 py-16 sm:px-8">
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              {PLANS.map((plan, i) => (
                <Reveal key={plan.id} delay={i * 80} className="h-full">
                  <PlanCard plan={plan} />
                </Reveal>
              ))}
            </div>

            {/* Add-on callout */}
            <div className="mx-auto mt-10 max-w-3xl glass-card rounded-2xl border border-slate-200 p-6 text-left shadow-md bg-[#f8fafc]/50">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-heading text-base font-bold text-slate-900">
                    Additional Profile Add-on (+1) — ₹499
                  </p>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    Need to predict for another percentile? Each ₹499 Add-on works with all existing base plans and can be purchased unlimited times. It never replaces your base subscription—it only extends your limits.
                  </p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    <li className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                      <Check className="h-3.5 w-3.5 text-blue-600" /> +1 Saved Percentile Profile
                    </li>
                    <li className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                      <Check className="h-3.5 w-3.5 text-blue-600" /> +1 MHT CET Predictor Profile
                    </li>
                    <li className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                      <Check className="h-3.5 w-3.5 text-blue-600" /> +1 All India Seat Predictor Profile
                    </li>
                    <li className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                      <Check className="h-3.5 w-3.5 text-blue-600" /> +1 Vacant Seat Tracker Category
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="mt-8 text-center text-xs text-slate-400">
              Payments are processed securely via UPI, cards, and net banking.
              Your plan is activated instantly after payment.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
