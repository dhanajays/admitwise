"use client"

import { motion } from "framer-motion"
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
    <section className="relative bg-slate-50/50 border-y border-slate-200/60 py-20 lg:py-24 overflow-hidden">
      {/* Background radial glow */}
      <div 
        className="absolute left-1/3 top-1/2 h-[350px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 pointer-events-none" 
        style={{ filter: "blur(100px)" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            How it works
          </span>
          <h2 className="mt-3 text-balance font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-gradient">
            From percentile to preference list in minutes
          </h2>
        </Reveal>

        <div className="relative mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 80}>
              <motion.div 
                whileHover={{ y: -5, scale: 1.015 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="glass-card relative h-full rounded-2xl p-6 shadow-md bg-white border border-slate-200/80 group cursor-default"
              >
                {/* Stepping index */}
                <span className="absolute right-5 top-5 font-heading text-4xl font-extrabold text-slate-100/80 group-hover:text-primary/10 transition-colors duration-300 select-none">
                  {String(i + 1).padStart(2, "0")}
                </span>
                
                {/* Icon wrapper */}
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50/60 border border-violet-100 text-primary shadow-sm shadow-indigo-500/5 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
                  <step.icon className="h-6 w-6" />
                </span>
                
                <h3 className="mt-5 font-heading text-base font-bold text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {step.description}
                </p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

