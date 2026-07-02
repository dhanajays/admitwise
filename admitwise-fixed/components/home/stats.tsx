import { AnimatedCounter } from "@/components/animated-counter"
import { Reveal } from "@/components/reveal"

const stats = [
  { value: 9, suffix: "+", label: "Years of cutoff data analysed" },
  { value: 42000, suffix: "+", label: "Students guided" },
  { value: 1200, suffix: "+", label: "Colleges in our database" },
  { value: 96, suffix: "%", label: "Prediction satisfaction rate" },
]

export function Stats() {
  return (
    <section className="relative border-y border-slate-200/60 bg-[#f8fafc] py-16 overflow-hidden">
      {/* Decorative center radial glow */}
      <div className="absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 filter blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 100}>
              <div className="glass-card hover:border-blue-500/20 hover:bg-white transition-all duration-300 rounded-2xl p-6 text-center shadow-md bg-white/70">
                <p className="font-heading text-3xl font-extrabold text-slate-900 sm:text-4xl">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {stat.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
