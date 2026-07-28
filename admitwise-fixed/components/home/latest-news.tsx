"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Newspaper, ArrowRight, Clock, ExternalLink, Sparkles } from "lucide-react"
import type { NewsArticleItem } from "@/lib/news/service"

export function LatestNewsSection() {
  const [articles, setArticles] = useState<NewsArticleItem[]>([])

  useEffect(() => {
    fetch("/api/news?limit=4")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.articles) {
          setArticles(data.articles.slice(0, 4))
        }
      })
      .catch(() => {})
  }, [])

  if (articles.length === 0) return null

  return (
    <section className="py-16 bg-slate-50/50 border-t border-slate-200/60 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
              Automated News Hub
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Latest Admission Updates &amp; Breaking News
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-2xl">
              Real-time official notifications, CAP round updates, merit lists, seat matrix releases, and counselling schedules.
            </p>
          </div>

          <Link
            href="/news"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-xs shrink-0 self-start md:self-auto"
          >
            <span>View All News Updates</span>
            <ArrowRight className="h-4 w-4 text-blue-600" />
          </Link>
        </div>

        {/* News Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {articles.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="glass-card rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Thumbnail Header */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={item.imageUrl || "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80"}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                    <span className="rounded-md bg-slate-900/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-extrabold uppercase text-white shadow-xs">
                      {item.category}
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <span className="rounded-md bg-blue-600/95 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      {item.source}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5">
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium mb-2.5">
                    <span>{new Date(item.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {item.readTime}
                    </span>
                  </div>

                  <h3 className="font-heading text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="p-5 pt-0">
                <Link
                  href={`/news/${item.slug}`}
                  className="mt-3 flex items-center justify-between w-full rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-blue-700 transition"
                >
                  <span>Read Article</span>
                  <ArrowRight className="h-3.5 w-3.5 text-blue-600 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
