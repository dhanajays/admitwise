"use client"

import React, { useMemo, useState, useEffect, useCallback } from "react"
import {
  Building2,
  GraduationCap,
  Info,
  TrendingUp,
  Trophy,
  X,
  FileDown,
  Loader2,
  Lock,
  Check,
  Shield,
  Cpu,
  Sparkles,
  Zap,
  ChevronRight,
  CheckCircle2,
  Award
} from "lucide-react"
import { useSession } from "next-auth/react"
import type { PredictionResult, StudentInput } from "@/lib/predictor/types"
import { generatePredictionPDF } from "@/lib/predictor/pdf-generator"
import { ChanceBadge } from "./chance-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UpgradeModal } from "./upgrade-modal"

type SortKey = "cutoff" | "chance" | "rank" | "name"

const SEARCH_BY_OPTIONS = [
  { value: "all", label: "All Fields" },
  { value: "name", label: "College Name" },
  { value: "code", label: "Institute Code" },
  { value: "branch", label: "Branch Name" },
  { value: "choice", label: "Choice Code" },
  { value: "university", label: "Home University" },
  { value: "type", label: "Institute Type" },
]

function getStarsAndChance(chance: string) {
  if (chance === "Very High") {
    return { stars: "⭐⭐⭐⭐⭐", label: "Very High", color: "text-emerald-600 font-bold" }
  } else if (chance === "High") {
    return { stars: "⭐⭐⭐⭐", label: "High", color: "text-emerald-500 font-bold" }
  } else {
    return { stars: "⭐⭐⭐", label: "Medium", color: "text-amber-500 font-bold" }
  }
}

function maskCollegeName(name: string): string {
  if (!name) return ""
  const firstChar = name[0] || ""
  const maskedLength = Math.max(8, name.length - 1)
  return firstChar + "*".repeat(maskedLength)
}

// Memoized Card Component to prevent heavy re-renders on dropdown/select filters state update
const ResultCard = React.memo(function ResultCard({
  college,
}: {
  college: PredictionResult
}) {
  return (
    <div className="glass-card w-full min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-md hover:border-blue-200 hover:shadow-lg transition duration-300 relative overflow-hidden bg-white/90">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
        {/* Left: College info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] rounded-lg">
              Rank #{college.rank}
            </Badge>
            <ChanceBadge band={college.chance} />
            <Badge
              variant="secondary"
              className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] rounded-lg"
            >
              {college.category}
            </Badge>
            {college.matchedUsing && (
              <Badge className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] rounded-lg">
                Matched Using: {college.matchedUsing}
              </Badge>
            )}
            {college.branchMatch && (
              <Badge variant="outline" className="border-blue-200 text-blue-700 text-[10px] rounded-lg">
                Preferred Branch
              </Badge>
            )}
            {college.homeUniversityRelevant && (
              <Badge variant="outline" className="border-indigo-200 text-indigo-700 text-[10px] rounded-lg">
                Home University
              </Badge>
            )}
          </div>

          <h3 className="mt-4 flex items-start gap-2.5 text-base sm:text-lg font-bold text-slate-900 leading-snug break-words">
            <Building2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <span>{college.collegeName}</span>
          </h3>

          <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 hover:text-slate-800 transition">
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span className="break-words">{college.branchName}</span>
            </span>
            <span className="hover:text-slate-800 transition">{college.status}</span>
          </div>

          {college.seatSection && (
            <p className="mt-1 text-[11px] text-slate-400">{college.seatSection}</p>
          )}

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
            {college.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Stats panel — full width on mobile, fixed sidebar on lg+ */}
        <div className="w-full lg:w-64 xl:w-72 shrink-0 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-4">
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
              {college.matchedUsing?.includes("NEET") ? "Closing Score" : "Closing Perc."}
            </p>
            <p className="font-bold text-slate-900 text-sm mt-0.5">
              {college.closingPercentile.toFixed(2)}
            </p>
          </div>

          {college.closingAllIndiaMerit !== undefined ? (
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">All India Merit</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {college.closingAllIndiaMerit.toLocaleString()}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Closing Rank</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {college.closingRank.toLocaleString()}
              </p>
            </div>
          )}

          {college.admissionType && (
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Admission Type</p>
              <p className="font-bold text-slate-900 text-[11px] mt-0.5 break-words" title={college.admissionType}>
                {college.admissionType}
              </p>
            </div>
          )}

          {college.seatType && (
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Seat Type</p>
              <p className="font-bold text-slate-900 text-[11px] mt-0.5 break-words" title={college.seatType}>
                {college.seatType}
              </p>
            </div>
          )}

          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Confidence</p>
            <p className="font-bold text-emerald-600 text-sm mt-0.5">{college.confidence}%</p>
          </div>

          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Chance Score</p>
            <p className="font-bold text-blue-600 text-sm mt-0.5">{college.chanceScore}%</p>
          </div>

          {/* Progress bar — always full width in the 2-col grid */}
          <div className="col-span-2">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${college.chanceScore}%` }}
              />
            </div>
          </div>

          <div className="col-span-2 flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 p-2.5">
            <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-xs font-bold text-slate-800">{college.chance} Chance</span>
          </div>
        </div>
      </div>
    </div>
  )
})


export const Results = React.memo(function Results({
  results,
  preferredBranches = [],
  enteredExams = [],
  input,
  isPaid = false,
}: {
  results: PredictionResult[]
  preferredBranches?: string[]
  enteredExams?: string[]
  input: StudentInput
  isPaid?: boolean
}) {
  const { data: session } = useSession()
  const [sort, setSort] = useState<SortKey>("cutoff")
  const [selectedPreference, setSelectedPreference] = useState<string>("all")
  const [selectedChance, setSelectedChance] = useState<string>("all")
  const [selectedExamFilter, setSelectedExamFilter] = useState<string>("all")
  const [visibleCount, setVisibleCount] = useState<number>(40)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchBy, setSearchBy] = useState("all")
  
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  const openUpgradeModal = useCallback(() => setIsUpgradeModalOpen(true), [])
  const closeUpgradeModal = useCallback(() => setIsUpgradeModalOpen(false), [])

  const renderLockedWrapper = (children: React.ReactNode, showLockIcon = true) => {
    if (isPaid) return children
    return (
      <div 
        onClick={openUpgradeModal}
        className="relative cursor-not-allowed opacity-60 group select-none transition-all duration-300 hover:opacity-85 w-full"
      >
        <div className="pointer-events-none">
          {children}
        </div>
        
        {/* Lock indicator */}
        {showLockIcon && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
            <Lock className="h-3.5 w-3.5" />
          </div>
        )}

        {/* Premium Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
          <div className="bg-slate-900/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap backdrop-blur-md border border-white/10 flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-blue-400" /> Available in Premium Plan
          </div>
          <div className="w-2.5 h-2.5 bg-slate-900/90 rotate-45 -mt-1.5 border-r border-b border-white/10" />
        </div>
      </div>
    )
  }

  // Reset filter settings if input predictions array is refreshed by the user
  useEffect(() => {
    setSelectedPreference("all")
    setSelectedChance("all")
    setSelectedExamFilter("all")
    setSort("cutoff")
    setVisibleCount(40)
    setSearchQuery("")
    setSearchBy("all")
  }, [results])

  // Reset visibleCount count if sorting or filters are updated
  useEffect(() => {
    setVisibleCount(40)
  }, [sort, selectedPreference, selectedChance, selectedExamFilter, searchQuery, searchBy])

  // Calculate Safe/Target/Dream stats
  const { totalCount, dreamCount, targetCount, safeCount } = useMemo(() => {
    let dream = 0
    let target = 0
    let safe = 0
    results.forEach((r) => {
      const margin = typeof r.margin === "number" ? r.margin : 0
      if (margin > 0.5) safe++
      else if (margin >= -1 && margin <= 0.5) target++
      else dream++
    })
    return {
      totalCount: results.length,
      dreamCount: dream,
      targetCount: target,
      safeCount: safe,
    }
  }, [results])

  const blurredCount = Math.max(0, results.length - 5)

  // Memoize filtered and sorted results to prevent expensive re-computations on re-renders
  const filteredAndSorted = useMemo(() => {
    if (!isPaid) {
      // For free users, bypass all filtering, searching, and sorting and return the raw top-5 predictions from results
      return results;
    }

    // 1. Apply Filters
    let data = results.filter((item) => {
      // Chance Level filter
      if (selectedChance !== "all" && item.chance !== selectedChance) {
        return false
      }

      // Branch Preference filter (only if multiple preferred branches selected)
      if (selectedPreference !== "all") {
        const idx = parseInt(selectedPreference, 10)
        if (!isNaN(idx) && preferredBranches[idx]) {
          const targetBranch = preferredBranches[idx].toLowerCase()
          if (item.branchName.toLowerCase() !== targetBranch) {
            return false
          }
        }
      }

      // Exam Filter (only if multiple exams entered and filter is active)
      if (selectedExamFilter !== "all") {
        if (!item.matchedUsing) return false
        const matched = item.matchedUsing.split(",").map((e) => e.trim())
        if (!matched.includes(selectedExamFilter)) {
          return false
        }
      }

      // Advanced search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const name = item.collegeName.toLowerCase()
        const code = item.collegeCode.toLowerCase()
        const branch = item.branchName.toLowerCase()
        const choice = item.branchCode.toLowerCase()
        const university = (item.homeUniversity || "").toLowerCase()
        const type = (item.instituteType || item.status || "").toLowerCase()

        if (searchBy === "name") {
          if (!name.includes(q)) return false
        } else if (searchBy === "code") {
          if (!code.includes(q)) return false
        } else if (searchBy === "branch") {
          if (!branch.includes(q)) return false
        } else if (searchBy === "choice") {
          if (!choice.includes(q)) return false
        } else if (searchBy === "university") {
          if (!university.includes(q)) return false
        } else if (searchBy === "type") {
          if (!type.includes(q)) return false
        } else {
          // "all" fields
          const matchedAny =
            name.includes(q) ||
            code.includes(q) ||
            branch.includes(q) ||
            choice.includes(q) ||
            university.includes(q) ||
            type.includes(q)
          if (!matchedAny) return false
        }
      }

      return true
    })

    // 2. Apply Sorting
    if (sort === "cutoff") {
      data.sort((a, b) => b.closingPercentile - a.closingPercentile)
    } else if (sort === "chance") {
      data.sort((a, b) => b.chanceScore - a.chanceScore)
    } else if (sort === "rank") {
      data.sort((a, b) => a.closingRank - b.closingRank)
    } else if (sort === "name") {
      data.sort((a, b) => a.collegeName.localeCompare(b.collegeName))
    }

    return data
  }, [results, sort, selectedPreference, selectedChance, selectedExamFilter, preferredBranches, searchQuery, searchBy])

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true)
      await generatePredictionPDF(
        filteredAndSorted,
        input,
        session?.user?.name
      )
    } catch (err) {
      console.error("Failed to generate PDF", err)
      alert("Failed to generate PDF report. Please try again.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleCheckoutPay = () => {
    if (!session || !session.user) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
      return
    }

    setIsPaying(true)
    import("@/lib/razorpay-client")
      .then((mod) => {
        const currentPlan = (session?.user as any)?.currentPlan || "free"
        const hasBasePlan = currentPlan !== "free"
        const resolvedPurchaseType = hasBasePlan ? "addon" : "plan"
        const resolvedPlanId = hasBasePlan ? undefined : "single"

        mod.checkout({
          purchaseType: resolvedPurchaseType,
          planId: resolvedPlanId,
          onSuccess: (details) => {
            setIsPaying(false)
            setIsUpgradeModalOpen(false)
            setTimeout(() => {
              window.location.href = "/dashboard"
            }, 1000)
          },
          onError: (err) => {
            setIsPaying(false)
            if (err !== "Payment cancelled by user") {
              alert(err || "Payment failed. Please try again.")
            }
          },
        })
      })
      .catch((err) => {
        setIsPaying(false)
        console.error("Failed to load checkout script", err)
        alert("Failed to load checkout utility. Please try again.")
      })
  }

  // Render Empty State suggestion layout
  if (results.length === 0) {
    return (
      <div className="glass-card rounded-2xl border border-slate-200 p-10 text-center relative overflow-hidden bg-white/80 animate-fade-in">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 filter blur-3xl" />
        <Info className="mx-auto h-10 w-10 text-slate-400 relative z-10" />
        <h2 className="mt-4 text-base font-bold text-slate-900 relative z-10">
          We couldn&apos;t find colleges with your selected filters.
        </h2>
        
        <div className="mt-4 text-left max-w-xs mx-auto relative z-10 bg-slate-50 border border-slate-200/60 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-700 mb-2">Suggestions</p>
          <ul className="space-y-1.5 text-xs text-slate-505 font-medium">
            <li className="flex items-center gap-1.5">• Change CAP Round</li>
            <li className="flex items-center gap-1.5">• Add more branches</li>
            <li className="flex items-center gap-1.5">• Try another category</li>
            <li className="flex items-center gap-1.5">• Remove strict filters</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-8">
      {/* Filters Header Bar */}
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Top {filteredAndSorted.length} Predictions
            </h2>
            <p className="text-xs text-slate-505 mt-0.5">
              Ranked using historical Maharashtra CAP cutoff data.
            </p>
          </div>
          
          <Button
            onClick={!isPaid ? () => setIsUpgradeModalOpen(true) : handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="w-full sm:w-auto rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                {!isPaid ? <Lock className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}
                Download Prediction Report
              </>
            )}
          </Button>
        </div>

        {/* Advanced Search Panel */}
        <div className="border-t border-b border-slate-200 py-4 my-1">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_180px]">
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Results</span>
              {renderLockedWrapper(
                <Input
                  type="text"
                  placeholder={!isPaid ? "🔒 Unlock Premium to Search Colleges" : "Search by college, code, branch..."}
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="h-10 text-xs border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 w-full"
                />,
                false
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search By Field</span>
              {renderLockedWrapper(
                <Select value={searchBy} onValueChange={(v) => v && setSearchBy(v)}>
                  <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl h-10 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 shadow-md">
                    {SEARCH_BY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
                true
              )}
            </div>
          </div>
        </div>

        {/* Unified Filter Controls Panel — wraps cleanly on all screen sizes */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
          {/* Sorting Control */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sorting</span>
            {renderLockedWrapper(
              <Select value={sort} onValueChange={(v) => v && setSort(v as SortKey)}>
                <SelectTrigger className="w-full sm:w-48 border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition text-xs h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white shadow-lg">
                  <SelectItem value="cutoff">Highest Cutoff (Default)</SelectItem>
                  <SelectItem value="chance">Best Chance</SelectItem>
                  <SelectItem value="rank">Closing Rank</SelectItem>
                  <SelectItem value="name">College Name (A–Z)</SelectItem>
                </SelectContent>
              </Select>,
              true
            )}
          </div>

          {/* Optional Branch Preference Control (Only if multiple branches selected) */}
          {preferredBranches && preferredBranches.length > 1 && (
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch Preference</span>
              {renderLockedWrapper(
                <Select value={selectedPreference} onValueChange={(v) => v && setSelectedPreference(v)}>
                  <SelectTrigger className="w-full sm:w-52 border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white shadow-lg max-w-[90vw]">
                    <SelectItem value="all">All Preferred Branches</SelectItem>
                    {preferredBranches.map((branch, idx) => {
                      const suffix = idx === 0 ? "st" : idx === 1 ? "nd" : idx === 2 ? "rd" : "th"
                      return (
                        <SelectItem key={idx} value={idx.toString()}>
                          {idx + 1}{suffix} Pref: {branch}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>,
                true
              )}
            </div>
          )}

          {/* Chance Level Control */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chance Level</span>
            {renderLockedWrapper(
              <Select value={selectedChance} onValueChange={(v) => v && setSelectedChance(v)}>
                <SelectTrigger className="w-full sm:w-40 border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition text-xs h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white shadow-lg">
                  <SelectItem value="all">All Chance Levels</SelectItem>
                  <SelectItem value="Very High">Very High</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Very Low">Very Low</SelectItem>
                </SelectContent>
              </Select>,
              true
            )}
          </div>

          {/* Show Results Based On Exam Control */}
          {enteredExams && enteredExams.length > 1 && (
            <div className="flex flex-col gap-1.5 min-w-0 animate-fade-in">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Show Results Based On
              </span>
              {renderLockedWrapper(
                <Select value={selectedExamFilter} onValueChange={(v) => v && setSelectedExamFilter(v)}>
                  <SelectTrigger className="w-full sm:w-44 border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white shadow-lg">
                    <SelectItem value="all">All Exams</SelectItem>
                    {enteredExams.map((exam) => (
                      <SelectItem key={exam} value={exam}>
                        {exam}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
                true
              )}
            </div>
          )}
        </div>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="glass-card rounded-2xl border border-slate-200 p-10 text-center relative overflow-hidden bg-white/80">
          <Info className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-4 text-sm font-semibold text-slate-900">
            We couldn&apos;t find colleges with your selected filters.
          </h3>
          <div className="mt-3 text-left max-w-xs mx-auto bg-slate-50 border border-slate-100 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-700 mb-2">Suggestions</p>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li className="flex items-center gap-1.5">• Change CAP Round</li>
              <li className="flex items-center gap-1.5">• Add more branches</li>
              <li className="flex items-center gap-1.5">• Try another category</li>
              <li className="flex items-center gap-1.5">• Remove strict filters</li>
            </ul>
          </div>
        </div>
      ) : isPaid ? (
        /* ------------------ PAID SUBSCRIPTION RESULTS ------------------ */
        <div className="space-y-6 animate-fade-in-up">
          {/* Summary stats at top for paid users too */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Total Matches</p>
              <p className="mt-1 text-xl font-bold text-blue-900">{totalCount} Colleges</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 shadow-sm">
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Dream Colleges</p>
              <p className="mt-1 text-xl font-bold text-rose-900">{dreamCount}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Target Colleges</p>
              <p className="mt-1 text-xl font-bold text-amber-900">{targetCount}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Safe Colleges</p>
              <p className="mt-1 text-xl font-bold text-emerald-900">{safeCount}</p>
            </div>
          </div>

          <div className="space-y-5">
            {filteredAndSorted.slice(0, visibleCount).map((college) => (
              <ResultCard
                key={`${college.rank}-${college.collegeCode}-${college.branchCode}-${college.category}`}
                college={college}
              />
            ))}
          </div>

          {filteredAndSorted.length > visibleCount && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setVisibleCount((prev) => prev + 40)}
                className="px-6 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold shadow-sm transition duration-305"
              >
                Show More Colleges (+40)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ------------------ FREE PREVIEW RESULTS ------------------ */
        <div className="space-y-8 pb-10">
          {/* Top 5 Predicted Colleges Only */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Preview Results (Top 5 Colleges)
              </h3>
            </div>
            <div className="space-y-5">
              {filteredAndSorted.slice(0, 5).map((college, idx) => (
                <ResultCard
                  key={`free-${idx}-${college.collegeCode}-${college.branchCode}-${college.category}`}
                  college={college}
                />
              ))}
            </div>
          </div>

          {/* Prediction Statistics Summary */}
          <div className="space-y-3 bg-[#f8fafc] border border-slate-200/70 rounded-2xl p-6 shadow-sm animate-fade-in-up">
            <h3 className="text-sm font-bold text-slate-905 tracking-tight flex items-center gap-2">
              <Trophy className="h-4.5 w-4.5 text-amber-505" />
              Prediction Summary
            </h3>
            
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
                <div className="absolute right-2 top-2 text-blue-500/5"><Building2 className="h-8 w-8" /></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Profile Matches</p>
                <p className="mt-1 text-lg font-black text-blue-700">{totalCount} Colleges</p>
              </div>

              <div className="rounded-xl border border-rose-100 bg-white p-4 shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
                <div className="absolute right-2 top-2 text-rose-500/5"><Trophy className="h-8 w-8" /></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dream Colleges</p>
                <p className="mt-1 text-lg font-black text-rose-600">{dreamCount} Colleges</p>
              </div>

              <div className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
                <div className="absolute right-2 top-2 text-amber-505/5"><TrendingUp className="h-8 w-8" /></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Colleges</p>
                <p className="mt-1 text-lg font-black text-amber-600">{targetCount} Colleges</p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
                <div className="absolute right-2 top-2 text-emerald-500/5"><Shield className="h-8 w-8" /></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Safe Colleges</p>
                <p className="mt-1 text-lg font-black text-emerald-600">{safeCount} Colleges</p>
              </div>
            </div>
          </div>

          {/* Remaining Locked & Blurred List with Lock Overlay */}
          <div className="relative mt-10 rounded-3xl border border-slate-200 bg-slate-50/20 p-2 overflow-hidden shadow-sm">
            <div className="space-y-4 pointer-events-none select-none blur-[6px] opacity-30 px-2 py-4">
              {filteredAndSorted.slice(5, 10).map((college, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400"><Lock className="h-4 w-4" /></span>
                    <span className="font-heading font-bold text-slate-800">
                      {maskCollegeName(college.collegeName)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Category: {college.category} · Branch: {maskCollegeName(college.branchName)}
                  </div>
                </div>
              ))}
              {(filteredAndSorted.length <= 5) && (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400"><Lock className="h-4 w-4" /></span>
                      <span className="font-heading font-bold text-slate-800">
                        {i === 1 ? "V*********" : i === 2 ? "W*********" : "A*********"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Premium Lock Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-white via-white/95 to-white/40 p-6 text-center z-20">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 border border-blue-100 shadow-sm text-blue-600 animate-bounce">
                <Lock className="h-4 w-4" />
              </div>
              
              <h4 className="mt-4 font-heading text-lg font-bold text-slate-900">
                🔒 {blurredCount} More Colleges Found
              </h4>
              <p className="mt-1 text-xs text-slate-550 font-medium">Unlock to see</p>

              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-left text-xs font-semibold text-slate-655 max-w-sm">
                {[
                  "Complete College List",
                  "Branch-wise Recommendations",
                  "AI Ranking",
                  "College Comparison",
                  "CAP Round Analysis",
                  "PDF Download",
                  "Vacant Seat Availability",
                  "Admission Chances",
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-1.5">
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] text-emerald-650 font-bold border border-emerald-100">✓</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="mt-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-8 py-3 shadow-md shadow-blue-500/10 transition-all duration-305 hover:scale-[1.02]"
              >
                Unlock Complete Prediction
              </Button>
            </div>
          </div>

          {/* Pricing Card Upgrade CTA Section */}
          <div className="mt-10 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-850 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden animate-fade-in-up">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/5 filter blur-2xl pointer-events-none" />
            <div className="absolute left-0 bottom-0 h-32 w-32 rounded-full bg-blue-400/10 filter blur-xl pointer-events-none" />

            <div className="relative z-10 grid gap-8 md:grid-cols-2 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-100">
                  <Sparkles className="h-3 w-3 text-yellow-350" /> Limited Time Offer
                </span>
                <h3 className="mt-3.5 font-heading text-xl font-bold tracking-tight md:text-2xl text-white">
                  Unlock Complete Prediction
                </h3>
                <p className="mt-2 text-xs text-blue-100 leading-relaxed max-w-sm">
                  Upgrade to the Single Predictor plan today and get instant access to the full official college cutoff database for your selected CAP round.
                </p>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-50">
                  {[
                    "Complete College List",
                    "AI Recommendation Engine",
                    "Official Cutoff Based Prediction",
                    "Branch-wise Ranking",
                    "PDF Report Download",
                    "CAP Round Guidance",
                    "Vacant Seat Tracker Access",
                    "WhatsApp Support",
                  ].map((feat) => (
                    <div key={feat} className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold text-emerald-400">✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center md:items-end justify-center border-t border-white/10 pt-6 md:border-t-0 md:pt-0">
                <div className="flex flex-col items-center md:items-end gap-1 bg-white/5 border border-white/10 rounded-2xl p-5 w-full max-w-[260px]">
                  <span className="text-xs text-blue-200 line-through font-semibold">Worth ₹2,999</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[9px] text-blue-200 font-bold uppercase mr-1">Today only</span>
                    <span className="font-heading text-3xl font-extrabold text-white">₹499</span>
                  </div>
                  <span className="text-[9px] text-blue-200">one-time payment</span>
                  
                  <Button
                    onClick={handleCheckoutPay}
                    disabled={isPaying}
                    className="mt-4 w-full rounded-full bg-white hover:bg-slate-50 text-blue-700 hover:text-blue-800 font-bold text-xs py-2.5 shadow-md shadow-black/5 flex items-center justify-center gap-2 group transition-all duration-300 hover:scale-[1.02]"
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-750" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Unlock Complete prediction
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Section */}
          <div className="mt-12 text-center pb-24 sm:pb-8">
            <h3 className="font-heading text-base font-bold text-slate-800">
              Why Students Trust AdmitWise
            </h3>
            
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Official Government Cutoff Data", desc: "Sourced directly from State Common Entrance Test Cell Maharashtra CAP round outcomes.", icon: Shield, color: "text-blue-500 bg-blue-50 border-blue-100" },
                { title: "AI Powered Prediction Engine", desc: "Machine learning algorithms weigh cutoff shifts to calculate highly precise admission chances.", icon: Cpu, color: "text-purple-500 bg-purple-50 border-purple-100" },
                { title: "Category & Quota Aware", desc: "Fully supports reservation category, gender, PwD, and Defence allocations.", icon: Award, color: "text-amber-500 bg-amber-50 border-amber-100" },
                { title: "Home University Based Prediction", desc: "Calculates local vs other university preferences based on seat distributions.", icon: Building2, color: "text-indigo-500 bg-indigo-50 border-indigo-100" },
                { title: "Thousands of College Combinations Analysed", desc: "Parses over 83,000 cutoff records dynamically in seconds to discover every opportunity.", icon: Sparkles, color: "text-pink-500 bg-pink-50 border-pink-100" },
                { title: "Secure Razorpay Payment", desc: "Industry-standard secure banking infrastructure with multiple checkout options.", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-50 border-emerald-100" },
                { title: "Instant Access After Payment", desc: "No manual review or waiting. Unlock and inspect full predictions instantly.", icon: Zap, color: "text-cyan-500 bg-cyan-50 border-cyan-100" }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="glass-card rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm hover:shadow-md transition-all duration-305 hover:-translate-y-0.5 animate-fade-in-up"
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${item.color} mb-3`}>
                    <item.icon className="h-4.5 w-4.5" />
                  </span>
                  <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                  <p className="mt-1 text-[11px] text-slate-550 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar — always visible for free users after prediction */}
      {!isPaid && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/97 backdrop-blur-md border-t border-slate-200 shadow-lg animate-fade-in flex items-center justify-between px-4 pt-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
        >
          <div className="text-left">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Unlock Complete Report</p>
            <p className="font-heading text-base font-extrabold text-slate-900">₹499</p>
          </div>
          <Button
            onClick={openUpgradeModal}
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 shadow-md shadow-blue-500/20 flex items-center gap-1.5"
          >
            Unlock Now <Lock className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Premium Upgrade Modal — rendered via React Portal into document.body
           This bypasses ALL parent overflow/stacking context issues.
           The body overflow-x-hidden on globals.css clips fixed children in Safari;
           the portal escapes that entirely. */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        onPay={handleCheckoutPay}
        isPaying={isPaying}
      />
    </div>
  )
})
