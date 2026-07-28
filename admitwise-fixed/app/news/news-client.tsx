"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  Clock,
  ExternalLink,
  Sparkles,
  Newspaper,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import type { NewsArticleItem } from "@/lib/news/service"

const CATEGORIES = [
  "All",
  "MHT CET",
  "CAP Round",
  "NEET",
  "JEE",
  "Official Notice",
  "Merit List",
  "Seat Matrix",
  "Vacant Seats",
  "Option Form",
  "Cutoffs",
  "Counselling",
]

interface NewsClientProps {
  initialData: {
    articles: NewsArticleItem[]
    total: number
    totalPages: number
  }
}

export function NewsClient({ initialData }: NewsClientProps) {
  const [articles, setArticles] = useState<NewsArticleItem[]>(initialData.articles)
  const [total, setTotal] = useState<number>(initialData.total)
  const [totalPages, setTotalPages] = useState<number>(initialData.totalPages)

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  const fetchNews = async (cat: string, query: string, p: number) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (cat !== "All") params.set("category", cat)
      if (query.trim()) params.set("q", query.trim())
      params.set("page", p.toString())
      params.set("limit", "12")

      const res = await fetch(`/api/news?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setArticles(data.articles)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } catch (err) {
      console.error("Failed to search news:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNews(selectedCategory, search, page)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, selectedCategory, page])

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat)
    setPage(1)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 pb-16">
        {/* Page Hero Section */}
        <section className="relative overflow-hidden bg-slate-900 text-white py-12 sm:py-16">
          <div className="glow-blob -left-20 top-0 h-72 w-72 bg-blue-600/20 filter blur-3xl" />
          <div className="glow-blob -right-20 bottom-0 h-72 w-72 bg-purple-600/20 filter blur-3xl" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-blue-300 backdrop-blur-md mb-4">
                <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" /> Live Admission News &amp; Updates
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Official Admission News Hub
              </h1>

              <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                Real-time official notifications, CAP round updates, merit lists, seat matrix releases, and counselling schedules for MHT CET, NEET, and JEE Main.
              </p>

              {/* Search Bar */}
              <div className="mt-8 w-full max-w-xl relative">
                <div className="relative flex items-center">
                  <Search className="absolute left-4 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Search by exam, headline, college, category or keyword..."
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800/90 pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xl transition"
                  />
                  {search && (
                    <button
                      onClick={() => {
                        setSearch("")
                        setPage(1)
                      }}
                      className="absolute right-4 text-xs font-bold text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Category Filters Bar */}
        <section className="sticky top-20 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs py-3">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span className="flex items-center gap-1 text-xs font-bold uppercase text-slate-400 shrink-0 pr-2 border-r border-slate-200">
                <Filter className="h-3.5 w-3.5" /> Filters
              </span>
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-650 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* News Grid Container */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Showing {articles.length} of {total} Admission Updates
            </p>
            {isLoading && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Updating news feed...
              </span>
            )}
          </div>

          {articles.length === 0 ? (
            <div className="glass-card rounded-3xl border border-slate-200 p-12 text-center bg-white my-8">
              <Newspaper className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">No Admission News Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                We couldn&apos;t find any news articles matching your search query &quot;{search}&quot;. Try clearing filters or searching for keywords like MHT CET, CAP Round, or Cutoffs.
              </p>
              <button
                onClick={() => {
                  setSearch("")
                  setSelectedCategory("All")
                  setPage(1)
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="glass-card rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Image Header */}
                    <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={item.imageUrl || "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80"}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
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

                    {/* Content */}
                    <div className="p-6">
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mb-3">
                        <span>{new Date(item.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {item.readTime}
                        </span>
                      </div>

                      <h2 className="font-heading text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition">
                        {item.title}
                      </h2>

                      <p className="mt-2.5 text-xs text-slate-500 line-clamp-3 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-6 pt-0">
                    <Link
                      href={`/news/${item.slug}`}
                      className="flex items-center justify-between w-full rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-blue-700 transition"
                    >
                      <span>Read Article &amp; Summary</span>
                      <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>

              <span className="px-4 text-xs font-bold text-slate-600">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition flex items-center gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
