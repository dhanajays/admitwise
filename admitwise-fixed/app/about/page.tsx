import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { BarChart3, Heart, ShieldCheck, Target, Sparkles } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { buttonVariants } from "@/components/ui/button"
import { Reveal } from "@/components/reveal"
import { AnimatedCounter } from "@/components/animated-counter"
import { generateSeoMetadata, getBreadcrumbSchema } from "@/lib/seo-schemas"
import { JsonLd } from "@/components/json-ld"

export const metadata: Metadata = generateSeoMetadata({
  title: "About AdmitWise | Our Vision, Mission & Team | MHT CET Counselling",
  description: "Learn more about AdmitWise, India's leading AI-powered college admission counselling platform. Discover our story, mission, core values, and expert team.",
  canonicalUrl: "https://admitwiseedu.com/about",
  keywords: [
    "About AdmitWise",
    "MHT CET Admission counselling team",
    "College cutoffs expert guidance",
    "AdmitWise Team",
  ],
})

const values = [
  {
    icon: Target,
    title: "Accuracy first",
    description: "Every prediction is grounded in verified historical cutoff data, never guesswork.",
  },
  {
    icon: ShieldCheck,
    title: "Honest guidance",
    description: "We show likelihood, not false promises. Predictions are guidance, not guarantees.",
  },
  {
    icon: BarChart3,
    title: "Data-driven",
    description: "A hybrid eligibility and ranking engine that explains every recommendation it makes.",
  },
  {
    icon: Heart,
    title: "Student-friendly",
    description: "Built for Indian students and parents, with clear language and fair pricing.",
  },
]

export default function AboutPage() {
  const breadcrumbs = getBreadcrumbSchema([
    { name: "Home", url: "https://admitwiseedu.com" },
    { name: "About", url: "https://admitwiseedu.com/about" },
  ])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <JsonLd data={breadcrumbs} />
      <SiteHeader />
      <main className="flex-1 bg-white">
        <section className="relative overflow-hidden border-b border-slate-200/50 bg-[#f8fafc] py-16">
          {/* Ambient background glows */}
          <div className="pointer-events-none absolute left-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-blue-500/5 filter blur-[120px]" />
          <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-indigo-500/5 filter blur-[100px]" />

          <div className="relative z-10 mx-auto grid max-w-screen-2xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-12 w-full">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5" /> Our Mission
              </span>
              
              <h1 className="mt-6 text-balance font-heading text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-gradient leading-[1.1]">
                Making admission guidance transparent and personalized
              </h1>
              
              <p className="mt-6 text-pretty text-slate-500 text-base leading-relaxed max-w-xl">
                AdmitWise was founded by a COEP Technological University Data Science student with a simple vision: every
                aspirant deserves clear, data-driven guidance — not expensive guesswork. We turn years of official cutoff
                data into predictions students and parents can actually trust.
              </p>
              
              <p className="mt-6 font-heading text-lg font-bold text-slate-900">
                AdmitWise — Smart Guidance. Better Admissions.
              </p>
              
              <div className="mt-8">
                <Link href="/predictor" className="btn-premium">
                  Try the Predictor
                </Link>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/50 p-2.5 shadow-2xl backdrop-blur-md">
                <Image
                  src="/images/about-counsellor.png"
                  alt="An AdmitWise career counsellor reviewing college admission analytics"
                  width={750}
                  height={550}
                  className="rounded-xl object-cover w-full h-auto max-h-[500px] transition-transform duration-700 hover:scale-[1.015]"
                  priority
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Values section */}
        <section className="bg-white">
          <div className="mx-auto max-w-screen-2xl px-4 py-20 sm:px-6 lg:px-12">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-heading text-3xl font-bold text-slate-900">Our Core Principles</h2>
              <p className="mt-3 text-slate-500 text-sm">We hold ourselves to the highest standard of trust and clarity.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((v, i) => (
                <Reveal key={v.title} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-350 transition duration-300">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                      <v.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-heading text-base font-bold text-slate-900">{v.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{v.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Stats section */}
        <section className="border-y border-slate-200/50 bg-[#f8fafc]">
          <div className="mx-auto grid max-w-screen-2xl grid-cols-2 gap-8 px-4 py-16 sm:px-6 lg:grid-cols-4 lg:px-12 text-center">
            {[
              { value: 42000, suffix: "+", label: "Students guided" },
              { value: 9, suffix: "+", label: "Years of data" },
              { value: 1200, suffix: "+", label: "Colleges tracked" },
              { value: 96, suffix: "%", label: "Satisfaction" },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 80} className="text-center">
                <p className="font-heading text-3xl font-extrabold text-blue-600 sm:text-4xl">
                  <AnimatedCounter value={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
              <h2 className="font-heading text-lg font-bold text-slate-900">Disclaimer</h2>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                AdmitWise predictions are based on historical official cutoff data and are intended for guidance only. Actual
                admissions depend on the seat matrix, reservation rules, number of applicants and official counselling
                decisions for each year, which can vary. AdmitWise does not guarantee admission to any college. Always verify
                final details with official counselling authorities.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
