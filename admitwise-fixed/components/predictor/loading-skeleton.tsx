"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Cpu, Sparkles, Database, ShieldAlert, BadgeCheck } from "lucide-react"

const PHASES = [
  { icon: Database, text: "Connecting to cutoff databases..." },
  { icon: ShieldAlert, text: "Factoring category & quota preference splits..." },
  { icon: Cpu, text: "Running hybrid eligibility matching engine..." },
  { icon: Sparkles, text: "Synthesizing MHT CET/JEE admission chances..." },
  { icon: BadgeCheck, text: "Formatting ranked recommendations..." },
]

export function LoadingSkeleton() {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  // Cycle phases slowly
  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setPhaseIndex((prev) => (prev < PHASES.length - 1 ? prev + 1 : prev))
    }, 1200)

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 95 ? prev + Math.random() * 8 : prev))
    }, 200)

    return () => {
      clearInterval(phaseInterval)
      clearInterval(progressInterval)
    }
  }, [])

  const CurrentIcon = PHASES[phaseIndex].icon

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* AI Processing Status Card */}
      <div className="glass-card rounded-2xl border border-violet-100 bg-white p-6 shadow-md relative overflow-hidden">
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/5 to-transparent -translate-x-full animate-[aw-shimmer_2s_infinite]" />
        
        <div className="flex flex-col items-center text-center py-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 border border-violet-100 text-primary mb-4">
            <CurrentIcon className="h-6 w-6 animate-pulse" />
          </div>

          <h3 className="font-heading text-base font-bold text-slate-905 leading-tight">
            AI College Prediction Engine
          </h3>
          
          <p className="mt-2 text-xs text-slate-500 font-semibold h-4 transition-all duration-300">
            {PHASES[phaseIndex].text}
          </p>

          {/* Progress bar */}
          <div className="mt-6 w-full max-w-xs space-y-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 w-full relative">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-650 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Matching data</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shimmer Cards Placeholders */}
      <div className="space-y-4">
        {[1, 2, 3].map((cardIdx) => (
          <div
            key={cardIdx}
            className="glass-card w-full rounded-2xl border border-slate-200/80 p-6 shadow-sm bg-white/70 relative overflow-hidden"
          >
            {/* Shimmer stripe */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/50 to-transparent -translate-x-full animate-[aw-shimmer_1.5s_infinite]" />

            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
              <div className="flex-1 space-y-3.5">
                {/* Badges block */}
                <div className="flex gap-2">
                  <div className="h-4.5 w-16 rounded bg-slate-100" />
                  <div className="h-4.5 w-20 rounded bg-slate-100" />
                  <div className="h-4.5 w-12 rounded bg-slate-100" />
                </div>
                {/* Title line */}
                <div className="h-5 w-3/4 rounded bg-slate-200" />
                {/* Detail line */}
                <div className="h-4 w-1/2 rounded bg-slate-100" />
                {/* Reasoning block */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <div className="h-3 w-5/6 rounded bg-slate-100" />
                  <div className="h-3 w-2/3 rounded bg-slate-100" />
                </div>
              </div>

              {/* Side block */}
              <div className="w-full lg:w-72 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 border border-slate-200/60 p-4">
                <div className="space-y-1.5">
                  <div className="h-2.5 w-12 rounded bg-slate-200" />
                  <div className="h-4 w-10 rounded bg-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2.5 w-12 rounded bg-slate-200" />
                  <div className="h-4 w-14 rounded bg-slate-200" />
                </div>
                <div className="col-span-2 h-2 rounded bg-slate-200" />
                <div className="col-span-2 h-8 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
