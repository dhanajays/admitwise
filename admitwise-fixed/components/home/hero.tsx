"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, BarChart3, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react"

export function Hero() {
  // Container stagger options
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  // Slide and fade reveals
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  }

  return (
    <section className="relative overflow-hidden bg-background text-foreground min-h-[calc(100vh-4rem)] flex items-center py-16 lg:py-24">
      {/* Animated Light background blobs */}
      <div 
        className="glow-blob -left-20 top-10 h-[450px] w-[450px] bg-primary/10" 
        style={{ filter: "blur(120px)" }}
      />
      <div 
        className="glow-blob -right-20 bottom-10 h-[400px] w-[400px] bg-accent/8" 
        style={{ filter: "blur(100px)" }}
      />

      <div className="relative z-10 mx-auto grid max-w-screen-2xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-12 w-full">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-start"
        >
          {/* Subtitle tag */}
          <motion.span 
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/50 px-3.5 py-1.5 text-xs font-semibold text-primary tracking-wide uppercase shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            Data-driven admission guidance for India
          </motion.span>

          {/* Heading */}
          <motion.h1 
            variants={itemVariants}
            className="mt-6 text-balance font-heading text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl text-gradient"
          >
            Predict your college before the counselling round begins.
          </motion.h1>

          {/* Paragraph */}
          <motion.p 
            variants={itemVariants}
            className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-slate-500 sm:text-lg"
          >
            AdmitWise analyses years of official cutoff data against your percentile, category, and preferences to
            recommend the colleges where you actually have a chance — for Engineering and Medical aspirants.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            variants={itemVariants}
            className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
              <Link
                href="/predictor"
                className="btn-premium flex items-center justify-center gap-2 text-sm font-semibold group shadow-indigo-500/10 w-full sm:w-auto"
              >
                Predict Your College
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
              <Link
                href="/contact"
                className="btn-premium-outline flex items-center justify-center gap-2 text-sm font-semibold text-slate-800 hover:text-slate-900 border-slate-205 bg-white w-full sm:w-auto shadow-sm"
              >
                Book 1:1 Counselling
              </Link>
            </motion.div>
          </motion.div>

          {/* Footer bullet lists */}
          <motion.div 
            variants={itemVariants}
            className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4 text-xs font-semibold text-slate-500"
          >
            <span className="flex items-center gap-2 hover:text-primary transition duration-300">
              <CheckCircle2 className="h-4.5 w-4.5 text-primary" /> Official Cutoff Data
            </span>
            <span className="flex items-center gap-2 hover:text-primary transition duration-300">
              <ShieldCheck className="h-4.5 w-4.5 text-primary" /> Category &amp; Quota Aware
            </span>
            <span className="flex items-center gap-2 hover:text-primary transition duration-300">
              <BarChart3 className="h-4.5 w-4.5 text-primary" /> Explainable Predictions
            </span>
          </motion.div>
        </motion.div>

        {/* Right Product Illustration */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.8, delay: 0.2 }}
          className="relative flex justify-center lg:justify-end"
        >
          {/* Glass frame container for the students image */}
          <motion.div 
            whileHover={{ y: -4, rotate: 0.5 }}
            className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/50 p-2.5 shadow-2xl backdrop-blur-md w-full max-w-[620px] lg:max-w-none"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-100/10 to-transparent z-10 pointer-events-none" />
            <img
              src="/images/hero-students.png"
              alt="AdmitWise Students"
              width={750}
              height={550}
              className="rounded-xl object-cover w-full h-auto max-h-[500px]"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

