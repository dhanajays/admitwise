import { ShieldCheck, Sparkles } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { PredictorForm } from "@/components/predictor/predictor-form"
import { getFilterOptions } from "@/lib/predictor/data"

export const metadata = {
  title: "Maharashtra College Predictor | AdmitWise",
  description:
    "Predict Engineering colleges using official MHT CET CAP cutoff data with category-wise and branch-wise recommendations.",
}

export default async function PredictorPage() {
  const options = await getFilterOptions()

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-200/50 bg-[#f8fafc] py-14">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute left-0 top-0 h-[300px] w-[400px] rounded-full bg-blue-500/5 filter blur-[100px]" />
          <div className="pointer-events-none absolute right-0 bottom-0 h-[200px] w-[300px] rounded-full bg-indigo-500/4 filter blur-[80px]" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 mb-5">
              <Sparkles className="h-3.5 w-3.5" /> AI-Powered Prediction Engine
            </span>

            <h1 className="font-heading text-4xl font-bold text-slate-900">
              Maharashtra College Predictor
            </h1>

            <p className="mt-4 max-w-2xl text-sm text-slate-500 leading-relaxed">
              Predict your admission chances using official MHT CET CAP cutoff data.
              Recommendations are generated using:
            </p>

            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-500 sm:grid-cols-3 max-w-2xl">
              {[
                "Previous CAP Round Cutoffs",
                "Category Wise Analysis",
                "Home University Preference",
                "Branch Preference",
                "Gender Reservation",
                "PwD & Defence Quota Support",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Based on Official Maharashtra CAP Cutoff Dataset
            </div>
          </div>
        </section>

        {/* Predictor Form */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <PredictorForm options={options} />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}