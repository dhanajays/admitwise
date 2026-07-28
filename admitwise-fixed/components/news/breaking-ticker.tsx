"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles, ArrowRight, ChevronRight } from "lucide-react"
import type { NewsArticleItem } from "@/lib/news/service"

export function BreakingTicker() {
  const [headlines, setHeadlines] = useState<NewsArticleItem[]>([])
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    fetch("/api/news?breaking=true")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.articles && data.articles.length > 0) {
          setHeadlines(data.articles)
        }
      })
      .catch(() => {})
  }, [])

  // Duplicate list to achieve seamless infinite looping
  const displayItems = headlines.length > 0 ? [...headlines, ...headlines] : []

  return (
    <div className="relative z-50 w-full bg-slate-950 text-slate-100 border-b border-slate-800/80 text-xs h-9 sm:h-10 flex items-center overflow-hidden select-none">
      <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-3 sm:px-6 h-full">
        {/* Left Fixed Badge */}
        <div className="flex items-center gap-2 shrink-0 pr-3 bg-slate-950 z-20 h-full">
          <span className="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white shadow-xs animate-pulse">
            ⚡ BREAKING:
          </span>
        </div>

        {/* Marquee Center Scrolling Area */}
        <div
          className="relative flex-1 overflow-hidden h-full flex items-center"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {displayItems.length > 0 ? (
            <div
              className={`flex items-center whitespace-nowrap gap-6 transition-all ${
                isPaused ? "[animation-play-state:paused]" : ""
              }`}
              style={{
                animation: `marquee ${Math.max(25, displayItems.length * 5)}s linear infinite`,
              }}
            >
              {displayItems.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="inline-flex items-center gap-4 shrink-0">
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-slate-200 hover:text-white hover:underline transition duration-200 flex items-center gap-1.5"
                  >
                    <span className="text-[10px] font-bold text-amber-400 uppercase bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.2 rounded shrink-0">
                      {item.source}
                    </span>
                    <span className="truncate max-w-[280px] sm:max-w-md md:max-w-xl">{item.title}</span>
                  </a>
                  <span className="text-slate-600 font-extrabold text-xs">|</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 font-medium text-xs">
              <span>Loading latest official admission notifications and CAP Round updates...</span>
            </div>
          )}
        </div>

        {/* Far Right Fixed Button */}
        <div className="flex items-center shrink-0 pl-3 bg-slate-950 z-20 h-full">
          <Link
            href="/news"
            className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-extrabold text-amber-400 hover:text-amber-300 transition duration-200 tracking-tight"
          >
            <span>View All Updates</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
