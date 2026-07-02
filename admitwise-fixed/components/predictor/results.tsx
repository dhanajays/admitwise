"use client"

import React, { useMemo, useState, useEffect } from "react"
import {
  Building2,
  GraduationCap,
  Info,
  TrendingUp,
  Trophy,
  X,
  FileDown,
  Loader2
} from "lucide-react"
import { useSession } from "next-auth/react"
import type { PredictionResult, StudentInput } from "@/lib/predictor/types"
import { generatePredictionPDF } from "@/lib/predictor/pdf-generator"
import { ChanceBadge } from "./chance-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SortKey = "cutoff" | "chance" | "rank" | "name"

export const Results = React.memo(function Results({
  results,
  preferredBranches = [],
  enteredExams = [],
  input,
}: {
  results: PredictionResult[]
  preferredBranches?: string[]
  enteredExams?: string[]
  input: StudentInput
}) {
  const { data: session } = useSession()
  const [sort, setSort] = useState<SortKey>("cutoff")
  const [selectedPreference, setSelectedPreference] = useState<string>("all")
  const [selectedChance, setSelectedChance] = useState<string>("all")
  const [selectedExamFilter, setSelectedExamFilter] = useState<string>("all")
  const [visibleCount, setVisibleCount] = useState<number>(40)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Reset filter settings if input predictions array is refreshed by the user
  useEffect(() => {
    setSelectedPreference("all")
    setSelectedChance("all")
    setSelectedExamFilter("all")
    setSort("cutoff")
    setVisibleCount(40)
  }, [results])

  // Reset visibleCount count if sorting or filters are updated
  useEffect(() => {
    setVisibleCount(40)
  }, [sort, selectedPreference, selectedChance, selectedExamFilter])

  // Memoize filtered and sorted results to prevent expensive re-computations on re-renders
  const filteredAndSorted = useMemo(() => {
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
  }, [results, sort, selectedPreference, selectedChance, selectedExamFilter, preferredBranches])

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

  if (filteredAndSorted.length === 0) {
    return (
      <div className="glass-card rounded-2xl border border-slate-200 p-10 text-center relative overflow-hidden bg-white/80">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 filter blur-3xl" />
        <Info className="mx-auto h-10 w-10 text-slate-400 relative z-10" />
        <h2 className="mt-4 text-xl font-bold text-slate-900 relative z-10">No Colleges Found</h2>
        <p className="mt-2 text-xs text-slate-500 max-w-xs mx-auto relative z-10">
          Try adjusting your percentile, category, or preferred branch filters.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters Header Bar */}
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Top {filteredAndSorted.length} Predictions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked using historical Maharashtra CAP cutoff data.
            </p>
          </div>
          
          <Button
            onClick={handleDownloadPDF}
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
                <FileDown className="h-4 w-4" />
                Download Prediction Report
              </>
            )}
          </Button>
        </div>

        {/* Unified Filter Controls Panel */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Sorting Control */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sorting</span>
            <Select value={sort} onValueChange={(v) => v && setSort(v as SortKey)}>
              <SelectTrigger className="w-52 border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white shadow-lg">
                <SelectItem value="cutoff">Highest Cutoff (Default)</SelectItem>
                <SelectItem value="chance">Best Chance</SelectItem>
                <SelectItem value="rank">Closing Rank</SelectItem>
                <SelectItem value="name">College Name (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Optional Branch Preference Control (Only if multiple branches selected) */}
          {preferredBranches && preferredBranches.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch Preference</span>
              <Select value={selectedPreference} onValueChange={(v) => v && setSelectedPreference(v)}>
                <SelectTrigger className="w-56 border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white shadow-lg !w-auto !min-w-(--anchor-width) !max-w-[90vw] md:!max-w-[450px]">
                  <SelectItem value="all">All Preferred Branches</SelectItem>
                  {preferredBranches.map((branch, idx) => {
                    const suffix = idx === 0 ? "st" : idx === 1 ? "nd" : idx === 2 ? "rd" : "th"
                    return (
                      <SelectItem key={idx} value={idx.toString()}>
                        {idx + 1}{suffix} Preference: {branch}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Chance Level Control */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chance Level</span>
            <Select value={selectedChance} onValueChange={(v) => v && setSelectedChance(v)}>
              <SelectTrigger className="w-44 border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition">
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
            </Select>
          </div>

          {/* Show Results Based On Exam Control */}
          {enteredExams && enteredExams.length > 1 && (
            <div className="flex flex-col gap-1.5 animate-fade-in">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Show Results Based On
              </span>
              <Select value={selectedExamFilter} onValueChange={(v) => v && setSelectedExamFilter(v)}>
                <SelectTrigger className="w-48 border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition">
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
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Cards List Container */}
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
            className="px-6 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold shadow-sm transition duration-300"
          >
            Show More Colleges (+40)
          </button>
        </div>
      )}
    </div>
  )
})

// Memoized Card Component to prevent heavy re-renders on dropdown/select filters state update
const ResultCard = React.memo(function ResultCard({
  college,
}: {
  college: PredictionResult
}) {
  return (
    <div className="glass-card rounded-2xl border border-slate-200 p-6 shadow-md hover:border-blue-200 hover:shadow-lg transition duration-300 relative overflow-hidden bg-white/90">
      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
        <div className="flex-1">
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

          <h3 className="mt-4 flex items-start gap-2.5 text-lg font-bold text-slate-900 leading-snug">
            <Building2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            {college.collegeName}
          </h3>

          <div className="mt-2.5 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 hover:text-slate-800 transition">
              <GraduationCap className="h-4.5 w-4.5" />
              {college.branchName}
            </span>
            <span className="hover:text-slate-800 transition">{college.status}</span>
          </div>

          {college.seatSection && (
            <p className="mt-1 text-[11px] text-slate-400">{college.seatSection}</p>
          )}

          <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
            {college.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
                <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats side panel inside cards */}
        <div className="grid w-full gap-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 lg:w-80 lg:grid-cols-2">
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">
              {college.matchedUsing?.includes("NEET") ? "Closing Score" : "Closing Percentile"}
            </p>
            <p className="font-bold text-slate-900 text-sm mt-0.5">
              {college.closingPercentile.toFixed(2)}
            </p>
          </div>

          {college.closingAllIndiaMerit !== undefined ? (
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">All India Merit</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {college.closingAllIndiaMerit.toLocaleString()}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Closing Rank</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {college.closingRank.toLocaleString()}
              </p>
            </div>
          )}

          {college.admissionType && (
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Admission Type</p>
              <p className="font-bold text-slate-900 text-[11px] truncate mt-0.5" title={college.admissionType}>
                {college.admissionType}
              </p>
            </div>
          )}

          {college.seatType && (
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Seat Type</p>
              <p className="font-bold text-slate-900 text-[11px] truncate mt-0.5" title={college.seatType}>
                {college.seatType}
              </p>
            </div>
          )}

          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Confidence</p>
            <p className="font-bold text-emerald-600 text-sm mt-0.5">{college.confidence}%</p>
          </div>

          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Chance Score</p>
            <p className="font-bold text-blue-600 text-sm mt-0.5">{college.chanceScore}%</p>
          </div>

          {/* Progress bar */}
          <div className="col-span-2">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                style={{ width: `${college.chanceScore}%` }}
              />
            </div>
          </div>

          <div className="col-span-2 flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 p-2.5">
            <Trophy className="h-4.5 w-4.5 text-amber-500" />
            <span className="text-xs font-bold text-slate-800">{college.chance} Chance</span>
          </div>
        </div>
      </div>
    </div>
  )
})
