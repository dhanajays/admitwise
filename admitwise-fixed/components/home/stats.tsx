"use client"

import { motion } from "framer-motion"
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
    <section className="relative border-y border-slate-200/60 bg-slate-50/50 py-16 overflow-hidden">
      {/* Decorative center radial glow */}
      <div 
        className="absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 pointer-events-none" 
        style={{ filter: "blur(100px)" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80}>
              <motion.div 
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="glass-card hover:border-primary/20 hover:bg-white transition-all rounded-2xl p-6 text-center shadow-md bg-white/70 relative group overflow-hidden cursor-default"
              >
                {/* Micro hover border glow */}
                <div className="absolute inset-0 border border-primary/0 group-hover:border-primary/10 rounded-2xl transition-all duration-300 pointer-events-none" />
                
                <p className="font-heading text-3xl font-extrabold text-slate-900 sm:text-4xl">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider leading-relaxed">
                  {stat.label}
                </p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

