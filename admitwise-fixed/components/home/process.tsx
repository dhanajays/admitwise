import { ClipboardList, Database, ListChecks, Sparkles } from "lucide-react"
import { Reveal } from "@/components/reveal"

const steps = [
  {
    icon: ClipboardList,
    title: "Enter your profile",
    description: "Add your exam, percentile or score, category, gender, home university and branch preferences.",
  },
  {
    icon: Database,
    title: "We match official cutoffs",
    description: "Your profile is compared against years of verified, category-wise closing ranks and percentiles.",
  },
  {
    icon: Sparkles,
    title: "Get ranked predictions",
    description: "A hybrid eligibility + ranking engine assigns each college a chance band and confidence score.",
  },
  {
    icon: ListChecks,
    title: "Plan your preference list",
    description: "Sort, filter and shortlist colleges, then unlock detailed reports and 1:1 counselling.",
  },
]

export function Process() {
  return (
    <section className="relative bg-[#f8fafc] border-y border-slate-200/60 py-20 lg:py-24 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute left-1/3 top-1/2 h-[350px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 filter blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            How it works
          </span>
          <h2 className="mt-3 text-balance font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-gradient">
            From percentile to preference list in minutes
          </h2>
        </Reveal>

        <div className="relative mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 90}>
              <div className="glass-card glass-card-hover relative h-full rounded-2xl p-6 shadow-md bg-white/80 border-slate-200">
                {/* Stepping index */}
                <span className="absolute right-5 top-5 font-heading text-4xl font-extrabold text-slate-100 select-none">
                  {String(i + 1).padStart(2, "0")}
                </span>
                
                {/* Icon wrapper */}
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shadow-sm shadow-blue-500/5">
                  <step.icon className="h-6 w-6" />
                </span>
                
                <h3 className="mt-5 font-heading text-lg font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
