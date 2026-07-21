"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"
import { Reveal } from "@/components/reveal"

const testimonials = [
  {
    quote:
      "AdmitWise predicted COEP for my CET percentile when I had almost given up. The chance bands were spot on and I locked my preference list with confidence.",
    name: "Aarav Deshmukh",
    detail: "Computer Engineering · COEP",
    initials: "AD",
  },
  {
    quote:
      "The NEET predictions saved my family weeks of guesswork. We knew exactly which government colleges were realistic for my category and rank.",
    name: "Sneha Patil",
    detail: "MBBS · GMC Nagpur",
    initials: "SP",
  },
  {
    quote:
      "The 1:1 counselling call plus the detailed report was worth every rupee. Clear, honest, and completely data-backed advice.",
    name: "Rohan Kulkarni",
    detail: "Mechanical Engineering · VJTI",
    initials: "RK",
  },
]

export function Testimonials() {
  return (
    <section className="relative bg-background py-20 lg:py-24 overflow-hidden">
      {/* Background radial glow */}
      <div 
        className="absolute right-10 bottom-10 h-[300px] w-[300px] rounded-full bg-accent/5 pointer-events-none" 
        style={{ filter: "blur(100px)" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Success stories
          </span>
          <h2 className="mt-3 text-balance font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-gradient">
            Trusted by students who got admitted
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 80}>
              <motion.figure 
                whileHover={{ y: -5, scale: 1.015 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="glass-card flex h-full flex-col rounded-2xl p-7 shadow-md bg-white border border-slate-200/80 group cursor-default relative overflow-hidden"
              >
                {/* Visual Accent Hover Border */}
                <div className="absolute inset-0 border border-primary/0 group-hover:border-primary/10 rounded-2xl transition-all duration-300 pointer-events-none z-30" />
                
                <div className="flex gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-5 flex-1 text-xs sm:text-sm leading-relaxed text-slate-600 italic">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 font-heading text-sm font-bold text-primary shadow-sm">
                    {t.initials}
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t.detail}</p>
                  </div>
                </figcaption>
              </motion.figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

