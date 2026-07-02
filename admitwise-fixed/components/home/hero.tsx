import Link from "next/link"
import { ArrowRight, BarChart3, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white text-slate-900 min-h-[calc(100vh-4rem)] flex items-center py-16 lg:py-24">
      {/* Light background radial gradient blobs */}
      <div className="glow-blob -left-20 top-10 h-[450px] w-[450px] bg-blue-500/5" />
      <div className="glow-blob -right-20 bottom-10 h-[400px] w-[400px] bg-indigo-500/5" />

      <div className="relative z-10 mx-auto grid max-w-screen-2xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-12 w-full">
        <div className="animate-fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-3.5 py-1.5 text-xs font-semibold text-blue-600 tracking-wide uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            Data-driven admission guidance for India
          </span>

          <h1 className="mt-6 text-balance font-heading text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl text-gradient">
            Predict your college before the counselling round begins.
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-slate-500 sm:text-lg">
            AdmitWise analyses years of official cutoff data against your percentile, category, and preferences to
            recommend the colleges where you actually have a chance — for Engineering and Medical aspirants.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/predictor"
              className="btn-premium flex items-center justify-center gap-2 text-sm font-semibold group shadow-blue-500/10"
            >
              Predict Your College
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/contact"
              className="btn-premium-outline flex items-center justify-center gap-2 text-sm font-semibold text-slate-800 hover:text-slate-900 border-slate-200 bg-white"
            >
              Book 1:1 Counselling
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-2 hover:text-slate-900 transition duration-300">
              <CheckCircle2 className="h-4.5 w-4.5 text-blue-600" /> Official Cutoff Data
            </span>
            <span className="flex items-center gap-2 hover:text-slate-900 transition duration-300">
              <ShieldCheck className="h-4.5 w-4.5 text-blue-600" /> Category &amp; Quota Aware
            </span>
            <span className="flex items-center gap-2 hover:text-slate-900 transition duration-300">
              <BarChart3 className="h-4.5 w-4.5 text-blue-600" /> Explainable Predictions
            </span>
          </div>
        </div>

        <div className="relative animate-fade-in-up flex justify-center lg:justify-end" style={{ animationDelay: "150ms" }}>
          {/* Glass frame container for the students image */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/50 p-2.5 shadow-2xl backdrop-blur-md w-full max-w-[620px] lg:max-w-none">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-100/10 to-transparent z-10 pointer-events-none" />
            <img
              src="/images/hero-students.png"
              alt="AdmitWise Students"
              width={750}
              height={550}
              className="rounded-xl object-cover w-full h-auto max-h-[500px] transition-transform duration-700 hover:scale-[1.015]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
