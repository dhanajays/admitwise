"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Reveal } from "@/components/reveal"

const faqs = [
  {
    q: "How accurate are AdmitWise predictions?",
    a: "Predictions are based on historical official cutoff data and an eligibility-aware ranking engine. They indicate likelihood, not a guarantee. Cutoffs vary each year with seat matrices, reservations and applicant counts.",
  },
  {
    q: "Which exams and streams are supported?",
    a: "We support major engineering entrances like MHT-CET and JEE, and medical admissions through NEET UG. Engineering and medical streams are handled separately with their own cutoff logic.",
  },
  {
    q: "Does the predictor account for category, quota and home university?",
    a: "Yes. The engine factors in category (OPEN, OBC, SC, ST, EWS and more), gender, quota type, home university relevance and PwD eligibility while ranking colleges.",
  },
  {
    q: "Is my data safe?",
    a: "Your profile inputs are used only to generate predictions. We follow strict privacy practices and never sell your data. See our disclaimer for details.",
  },
]

export function FaqCta() {
  return (
    <section className="relative bg-slate-50/50 py-20 lg:py-24 border-t border-slate-200/60 overflow-hidden">
      {/* Background ambient light */}
      <div 
        className="glow-blob -left-48 bottom-10 h-[350px] w-[350px] bg-primary/5" 
        style={{ filter: "blur(100px)" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              FAQ
            </span>
            <h2 className="mt-3 text-balance font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-gradient">
              Questions, answered
            </h2>
            <p className="mt-4 text-sm text-slate-505 leading-relaxed">
              Everything you need to know about how AdmitWise works and what to expect from your predictions.
            </p>
            <Accordion className="mt-8 w-full border-t border-slate-200/80">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-b border-slate-200/80 py-1">
                  <AccordionTrigger className="text-left font-semibold text-slate-800 hover:text-primary hover:no-underline transition duration-300">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-500 leading-relaxed text-xs">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>

          <Reveal delay={120}>
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className="glass-card relative overflow-hidden rounded-3xl p-8 sm:p-10 shadow-xl h-full flex flex-col justify-center bg-white border border-slate-200/80 group cursor-default"
            >
              {/* Radial glow background inside the card */}
              <div 
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/5" 
                style={{ filter: "blur(80px)" }}
              />
              <div className="relative z-10">
                <h3 className="text-balance font-heading text-2xl font-extrabold text-slate-900 sm:text-3xl">
                  Ready to find your best-fit colleges?
                </h3>
                <p className="mt-4 text-xs sm:text-sm text-slate-550 leading-relaxed">
                  Run a free prediction in minutes, then upgrade to a detailed report or 1:1 counselling session when
                  you&apos;re ready to plan your preference list.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                    <Link 
                      href="/predictor" 
                      className="btn-premium flex items-center justify-center gap-2 text-sm font-semibold group shadow-indigo-500/10 w-full sm:w-auto"
                    >
                      Start Predicting
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                    <Link
                      href="/plans"
                      className="btn-premium-outline flex items-center justify-center gap-2 text-sm font-semibold text-slate-800 hover:text-slate-950 border-slate-200 bg-white w-full sm:w-auto"
                    >
                      View Plans
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

