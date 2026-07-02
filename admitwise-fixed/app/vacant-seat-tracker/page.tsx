"use client"

import React, { useEffect, useState, useMemo, useTransition } from "react"
import { useSession } from "next-auth/react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Reveal } from "@/components/reveal"
import { UpgradePopup } from "@/components/plans/upgrade-popup"
import Link from "next/link"
import {
  isSubscribed,
  getSubscription,
  syncWithDatabase,
  findTrackerProfile,
  addTrackerProfile,
} from "@/lib/subscription/store"
import type { UserSubscription } from "@/lib/subscription/types"
import { calculateUnifiedStats } from "@/lib/subscription/limits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  GraduationCap,
  Sparkles,
  Info,
  Layers,
  Search,
  BookOpen,
  UserCheck,
  CheckSquare,
  AlertTriangle,
  Loader2,
} from "lucide-react"

import {
  EXAMS,
  CATEGORIES,
  CAP_ROUNDS,
  STANDARDIZED_BRANCHES,
} from "@/lib/master-config"

// ─── CAP Round access rules per plan ─────────────────────────────────────────
// Always checks the BASE plan. Add-ons never change round permissions.
function getTrackerRoundAccess(plan: string): {
  lockAfterFirstSearch: boolean   // true only for 'single'
  allowedRounds: string[] | "all" // "all" = no restriction
} {
  if (plan === "single") {
    return { lockAfterFirstSearch: true, allowedRounds: "all" }
  }
  // multi_round, premium, elite → all rounds, never locked
  return { lockAfterFirstSearch: false, allowedRounds: "all" }
}

const GENDERS = ["Male", "Female"]
const UNIVERSITIES = [
  "Dr. Babasaheb Ambedkar Marathwada University",
  "Kavayitri Bahinabai Chaudhari North Maharashtra University",
  "Mumbai University",
  "Punhashloki Ahilyadevi Holkar Solapur University",
  "Rashtrasant Tukadoji Maharaj Nagpur University",
  "Savitribai Phule Pune University",
  "Shivaji University",
  "Sant Gadge Baba Amravati University",
  "Swami Ramanand Teerth Marathwada University",
  "Gondwana University",
  "Dr. Babasaheb Ambedkar Technological University",
  "Maharashtra State (All Universities)",
]

const SEARCH_BY_OPTIONS = [
  { value: "all", label: "All Fields" },
  { value: "name", label: "College Name" },
  { value: "code", label: "Institute Code" },
  { value: "branch", label: "Branch Name" },
  { value: "choice", label: "Choice Code" },
  { value: "university", label: "Home University" },
  { value: "type", label: "Institute Type" },
]

type TrackFormInput = {
  exam: string
  round: string
  gender: string
  category: string
  homeUniversity: string
  preferredBranches: string[]
  pwd: boolean
  pwdCategory: string
  defense: boolean
}

type SeatResult = {
  id: string
  instituteName: string
  courseName: string
  instituteType: string
  choiceCode: string
  round: string
  availableSeats: number
  seatCategory: string
  matchedThrough?: string
  seatLabel?: string
  homeUniversity: string
  branch: string
  instituteCode: string
}

export default function VacantSeatTrackerPage() {
  const { data: session, status } = useSession()
  const [isPending, startTransition] = useTransition()

  // Matrix status & locking state
  const [datasetAvailable, setDatasetAvailable] = useState(false)
  const [lockedCategory, setLockedCategory] = useState<string | null>(null)
  const [showUpgradePopup, setShowUpgradePopup] = useState(false)

  // Tracking results state
  const [results, setResults] = useState<SeatResult[] | null>(null)
  const [sortKey, setSortKey] = useState<"priority" | "seats" | "name" | "branch" | "type">("priority")
  const [visibleCount, setVisibleCount] = useState(40)

  // Search filter for branches
  const [branchSearch, setBranchSearch] = useState("")

  // Advanced client-side search states
  const [searchQuery, setSearchQuery] = useState("")
  const [searchBy, setSearchBy] = useState("all")

  // Form states
  const [form, setForm] = useState<TrackFormInput>({
    exam: EXAMS[0],
    round: CAP_ROUNDS[0].id,
    gender: GENDERS[0],
    category: CATEGORIES[0],
    homeUniversity: UNIVERSITIES[11], // Maharashtra State default
    preferredBranches: [],
    pwd: false,
    pwdCategory: "PWD Common",
    defense: false,
  })

  const [sub, setSub] = useState<UserSubscription | null>(null)

  const [selectedTrackerProfileId, setSelectedTrackerProfileId] = useState<string>("")

  const isTrackerProfileSelected = useMemo(() => {
    return !!(sub?.plan === "single" && selectedTrackerProfileId && selectedTrackerProfileId !== "new")
  }, [sub, selectedTrackerProfileId])

  // Auto-initialize selectedTrackerProfileId to first profile on load
  useEffect(() => {
    if (sub && sub.plan === "single" && sub.trackerProfiles.length > 0 && !selectedTrackerProfileId) {
      const firstProfile = sub.trackerProfiles[0]
      setSelectedTrackerProfileId(firstProfile.id)
      setForm((prev) => ({
        ...prev,
        exam: firstProfile.exam,
        round: firstProfile.round,
        category: firstProfile.category,
      }))
    }
  }, [sub, selectedTrackerProfileId])





  // Sync session locks and local subscription state
  useEffect(() => {
    const handleStorage = () => {
      setSub(getSubscription())
    }
    window.addEventListener("storage", handleStorage)
    setSub(getSubscription())

    // Auto-sync client state with database on mount
    syncWithDatabase().then((updated) => {
      setSub(updated)
    })

    // Check if any active dataset exists on mount
    fetch("/api/vacant-seats/track")
      .then((res) => res.json())
      .then((data) => {
        setDatasetAvailable(!!data.active)
      })
      .catch(() => {})

    return () => {
      window.removeEventListener("storage", handleStorage)
    }
  }, [session])

  // Calculate unified stats
  const stats = useMemo(() => {
    if (!sub) return null
    return calculateUnifiedStats(
      sub.plan,
      sub.maxProfiles,
      sub.trackerMaxProfiles,
      [],
      sub.trackerProfiles ?? []
    )
  }, [sub])

  // Revert/lock category selection automatically when limits are reached
  useEffect(() => {
    if (!sub || !stats) return
    const uniqueCats = Array.from(new Set((sub.trackerProfiles || []).map((p) => p.category.toUpperCase())))
    if (stats.tracker.used >= stats.tracker.max && uniqueCats.length > 0) {
      if (!uniqueCats.includes(form.category.toUpperCase())) {
        set("category", uniqueCats[0])
      }
    }
  }, [sub, stats, form.category])

  // Reset pagination count on sort/filter update
  useEffect(() => {
    setVisibleCount(40)
  }, [sortKey, results])

  const set = <K extends keyof TrackFormInput>(key: K, value: TrackFormInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleBranch = (branch: string) => {
    setForm((prev) => {
      const exists = prev.preferredBranches.includes(branch)
      return {
        ...prev,
        preferredBranches: exists
          ? prev.preferredBranches.filter((b) => b !== branch)
          : [...prev.preferredBranches, branch],
      }
    })
  }

  // Handle Submit / Search
  const handleTrackSeats = (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Auth Check
    if (!session || !session.user) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
      return
    }

    // 2. Subscription Gate Check
    if (!isSubscribed()) {
      window.location.href = "/plans"
      return
    }

    const activeSub = sub || getSubscription()
    let remaining = 0
    let isNewProfile = false

    if (activeSub.plan === "single") {
      remaining = Math.max(0, activeSub.trackerMaxProfiles - activeSub.trackerProfiles.length)
      isNewProfile = selectedTrackerProfileId === "new" || !selectedTrackerProfileId
    } else {
      const uniqueCats = Array.from(new Set(activeSub.trackerProfiles.map((p) => p.category.toUpperCase())))
      remaining = Math.max(0, activeSub.trackerMaxProfiles - uniqueCats.length)
      isNewProfile = !uniqueCats.includes(form.category.toUpperCase())
    }

    if (isNewProfile && remaining <= 0) {
      setShowUpgradePopup(true)
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/vacant-seats/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exam: form.exam,
            round: form.round,
            gender: form.gender,
            category: form.category,
            homeUniversity: form.homeUniversity === "Maharashtra State (All Universities)" ? "" : form.homeUniversity,
            preferredBranches: form.preferredBranches,
            pwd: form.pwd,
            defense: form.defense,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          alert(err.error || "Failed to fetch seat vacancy data")
          return
        }

        const data = await res.json()
        setResults(data.results)

        // Sync local cache lock status with database
        const updated = await syncWithDatabase()
        setSub(updated)

        // Auto-select the newly created tracker profile
        if (isNewProfile && activeSub.plan === "single") {
          const matched = updated.trackerProfiles.find(
            (p) => p.category.toUpperCase() === form.category.toUpperCase() && p.round === form.round
          )
          if (matched) {
            setSelectedTrackerProfileId(matched.id)
          }
        }

        requestAnimationFrame(() => {
          document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" })
        })
      } catch (error) {
        console.error("Error matching seats:", error)
      }
    })
  }

  // Filtered list matching advanced client-side queries
  const filteredResults = useMemo(() => {
    if (!results) return []
    if (!searchQuery.trim()) return results

    const q = searchQuery.toLowerCase().trim()

    return results.filter((item) => {
      const name = item.instituteName.toLowerCase()
      const code = item.instituteCode.toLowerCase()
      const branch = item.courseName.toLowerCase()
      const choice = item.choiceCode.toLowerCase()
      const university = item.homeUniversity.toLowerCase()
      const type = item.instituteType.toLowerCase()

      if (searchBy === "name") return name.includes(q)
      if (searchBy === "code") return code.includes(q)
      if (searchBy === "branch") return branch.includes(q)
      if (searchBy === "choice") return choice.includes(q)
      if (searchBy === "university") return university.includes(q)
      if (searchBy === "type") return type.includes(q)

      return (
        name.includes(q) ||
        code.includes(q) ||
        branch.includes(q) ||
        choice.includes(q) ||
        university.includes(q) ||
        type.includes(q)
      )
    })
  }, [results, searchQuery, searchBy])

  // Sorted list memoized for performance
  const sortedResults = useMemo(() => {
    const list = [...filteredResults]
    if (sortKey === "seats") {
      list.sort((a, b) => b.availableSeats - a.availableSeats)
    } else if (sortKey === "name") {
      list.sort((a, b) => a.instituteName.localeCompare(b.instituteName))
    } else if (sortKey === "branch") {
      list.sort((a, b) => a.courseName.localeCompare(b.courseName))
    } else if (sortKey === "type") {
      list.sort((a, b) => a.instituteType.localeCompare(b.instituteType))
    }
    // "priority" sorting preserves the prioritized response array from the matching engine
    return list
  }, [filteredResults, sortKey])

  const resultsView = useMemo(() => {
    if (sortedResults.length === 0) return null
    return (
      <div className="space-y-5">
        {sortedResults.slice(0, visibleCount).map((item) => (
          <ResultCard key={item.id} result={item} />
        ))}
      </div>
    )
  }, [sortedResults, visibleCount])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1 bg-white">
        <section className="relative overflow-hidden border-b border-slate-200/50 bg-[#f8fafc] py-16">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[550px] -translate-x-1/2 rounded-full bg-blue-600/5 filter blur-[100px]" />
          <div className="relative z-10 mx-auto max-w-4xl px-4 py-4 text-center sm:px-6 lg:px-8">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-3.5 py-1.5 text-xs font-semibold text-blue-650 uppercase tracking-wide">
                <Layers className="h-3.5 w-3.5" /> Vacant Seat tracker
              </span>
              <h1 className="mx-auto mt-5 max-w-2xl text-balance font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl text-gradient">
                Track Live Vacancies Before Each Round
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-sm text-slate-500 leading-relaxed">
                Filter the official MHT CET Vacant Seat Matrix based on your category, gender, and branch preferences to identify available openings instantly.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
              {/* Sidebar Form */}
              <div>
                <form onSubmit={handleTrackSeats} className="glass-card rounded-3xl border border-slate-200 bg-white p-6 shadow-lg space-y-5">
                  <h2 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
                    <Search className="h-5 w-5 text-blue-600" /> Filter Criteria
                  </h2>

                  {sub && sub.trackerMaxProfiles > 0 && !!sub.activatedAt && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs">
                        <span className="text-slate-500 text-[11px]">
                          Tracker Profiles:{" "}
                          <span className="font-semibold text-slate-900">
                            {sub.plan === "single" ? sub.trackerProfiles.length : Array.from(new Set(sub.trackerProfiles.map(p => p.category.toUpperCase()))).length} / {sub.trackerMaxProfiles} used
                          </span>
                        </span>
                        <Link
                          href="/dashboard"
                          className="text-blue-650 hover:text-blue-750 font-semibold transition"
                        >
                          My Plan
                        </Link>
                      </div>

                      {sub.plan === "single" && (() => {
                        const remaining = Math.max(0, sub.trackerMaxProfiles - sub.trackerProfiles.length)
                        return (
                          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-650 flex flex-col gap-1.5 w-full animate-fade-in mt-2 shadow-sm">
                            <span className="font-semibold text-slate-800 text-[11px]">Tracker Profiles</span>
                            <div className="grid grid-cols-2 gap-1 text-center text-[10px] bg-white/60 rounded-xl p-2 border border-blue-100/50">
                              <div>
                                <div className="text-slate-400 font-medium leading-none">Used</div>
                                <div className="text-slate-700 font-bold text-xs mt-1">{sub.trackerProfiles.length} / {sub.trackerMaxProfiles}</div>
                              </div>
                              <div>
                                <div className="text-slate-400 font-medium leading-none">Remaining</div>
                                <div className="text-slate-700 font-bold text-xs mt-1">{remaining}</div>
                              </div>
                            </div>
                            
                            {remaining > 0 ? (
                              <div className="text-[11px] text-blue-755 font-medium leading-relaxed mt-1">
                                ✅ You have {remaining} unused Single Tracker slot{remaining > 1 ? "s" : ""} available.<br/>
                                <span className="text-slate-500 font-normal">Select a new tracker profile to continue.</span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-amber-600 font-semibold leading-relaxed mt-1">
                                All Single Tracker slots have been used.<br/>
                                <span className="text-slate-500 font-normal">Purchase another ₹499 plan or upgrade to the Multi-Round plan.</span>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  <div className="space-y-4">
                    {sub?.plan === "single" && sub.trackerProfiles.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-650">Select Tracker Profile</Label>
                        <Select
                          value={selectedTrackerProfileId}
                          onValueChange={(v) => {
                            setSelectedTrackerProfileId(v || "")
                            if (v === "new") {
                              setForm((prev) => ({
                                ...prev,
                                round: CAP_ROUNDS[0].id,
                                category: CATEGORIES[0],
                              }))
                            } else {
                              const p = sub.trackerProfiles.find((x) => x.id === v)
                              if (p) {
                                setForm((prev) => ({
                                  ...prev,
                                  exam: p.exam,
                                  round: p.round,
                                  category: p.category,
                                }))
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl h-11">
                            <SelectValue>
                              {(() => {
                                if (selectedTrackerProfileId === "new") return "➕ Create New Tracker Profile"
                                const matched = sub.trackerProfiles.find(x => x.id === selectedTrackerProfileId)
                                if (!matched) return "Select Tracker Profile"
                                const idx = sub.trackerProfiles.findIndex(x => x.id === selectedTrackerProfileId)
                                return `Tracker Profile ${idx + 1} (${matched.exam} • Round ${matched.round} • ${matched.category})`
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 shadow-lg">
                            {sub.trackerProfiles.map((p, idx) => (
                              <SelectItem key={p.id} value={p.id}>
                                📁 Tracker Profile {idx + 1} ({p.exam} • Round {p.round} • {p.category})
                              </SelectItem>
                            ))}
                            {Math.max(0, sub.trackerMaxProfiles - sub.trackerProfiles.length) > 0 && (
                              <SelectItem value="new" className="text-blue-600 font-semibold">
                                ➕ Create New Tracker Profile
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {isTrackerProfileSelected && (() => {
                      const p = sub?.trackerProfiles?.find(x => x.id === selectedTrackerProfileId)
                      if (!p) return null
                      return (
                        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-xs text-amber-700 animate-fade-in shadow-sm leading-relaxed">
                          <span className="font-bold">Tracker Profile: Round {p.round} • {p.category}</span>
                          <p className="mt-1 text-slate-500 font-normal">
                            This is a saved tracker profile. Its CAP Round and Category cannot be changed. Create a new tracker profile to use a different Round or Category.
                          </p>
                        </div>
                      )
                    })()}

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-650">Exam</Label>
                      <Select
                        value={form.exam}
                        onValueChange={(v) => v && set("exam", v)}
                        disabled={isTrackerProfileSelected}
                      >
                        <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 shadow-lg">
                          {EXAMS.map((e) => (
                            <SelectItem key={e} value={e}>{e}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                     <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-655">CAP Admission Round</Label>
                        <Select
                          value={form.round}
                          onValueChange={(v) => v && set("round", v)}
                          disabled={isTrackerProfileSelected}
                        >
                          <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 shadow-lg">
                            {CAP_ROUNDS.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isTrackerProfileSelected && (
                          <p className="text-[10px] text-amber-600 font-semibold mt-1">
                            🔒 Profile locked to {CAP_ROUNDS.find((r) => r.id === form.round)?.label || form.round} for category {form.category}.
                          </p>
                        )}
                        {!isTrackerProfileSelected && sub?.plan === "single" && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            ℹ️ Select any round. Once search is performed, it locks to that round for this tracker profile.
                          </p>
                        )}
                     </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-650">Gender</Label>
                        <Select value={form.gender} onValueChange={(v) => v && set("gender", v)}>
                          <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 shadow-lg">
                            {GENDERS.map((g) => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-655">Category</Label>
                        <Select
                          value={form.category}
                          onValueChange={(v) => v && set("category", v)}
                          disabled={isTrackerProfileSelected}
                        >
                          <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 shadow-lg !w-auto !min-w-(--anchor-width) !max-w-[90vw] md:!max-w-[450px]">
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!isTrackerProfileSelected && sub?.plan === "single" && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Choose your category carefully. Once tracking is performed, the selected category becomes permanent for this tracker profile.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-655">Home University</Label>
                      <Select value={form.homeUniversity} onValueChange={(v) => v && set("homeUniversity", v)}>
                        <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 shadow-lg !w-auto !min-w-(--anchor-width) !max-w-[90vw] md:!max-w-[450px]">
                          {UNIVERSITIES.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Preferred Branches Multi-select Checkboxes */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-650">Preferred Branches</Label>
                      <Input
                        type="text"
                        placeholder="Search branches..."
                        value={branchSearch}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBranchSearch(e.target.value)}
                        className="h-8.5 text-xs border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500"
                      />
                      <div className="rounded-xl border border-slate-200 p-3 max-h-48 overflow-y-auto space-y-1.5 bg-slate-50/50">
                        {STANDARDIZED_BRANCHES.filter((b) =>
                          b.name.toLowerCase().includes(branchSearch.toLowerCase())
                        ).map((b) => {
                          const checked = form.preferredBranches.includes(b.name)
                          return (
                            <label key={b.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-blue-50/70 hover:text-blue-750 transition duration-300">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleBranch(b.name)}
                                className="h-4.5 w-4.5 rounded border-slate-350 bg-white accent-blue-600 cursor-pointer mt-0.5"
                              />
                              <span className="leading-normal break-words whitespace-normal pr-1">{b.name}</span>
                            </label>
                          )
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400">Leave blank to search all branches.</p>
                    </div>

                    {/* PwD Reservation */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <label className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                        Person with disability (PwD)
                        <input
                          type="checkbox"
                          checked={form.pwd}
                          onChange={(e) => set("pwd", e.target.checked)}
                          className="h-4.5 w-4.5 rounded border-slate-300 bg-white accent-blue-600 cursor-pointer"
                        />
                      </label>
                      {form.pwd && (
                        <div className="space-y-1.5 pt-1 border-t border-slate-200/50">
                          <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">PwD Category</Label>
                          <Select value={form.pwdCategory} onValueChange={(v) => v && set("pwdCategory", v)}>
                            <SelectTrigger className="border-slate-200 bg-white text-slate-805 rounded-xl h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 shadow-md">
                              <SelectItem value="PWD Common">PWD Common Seats</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Defence Quota */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-300">
                      <label className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-805 cursor-pointer select-none">
                        Defence Quota
                        <input
                          type="checkbox"
                          checked={form.defense}
                          onChange={(e) => set("defense", e.target.checked)}
                          className="h-4.5 w-4.5 rounded-lg border-slate-300 bg-white accent-blue-600 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isPending || !datasetAvailable}
                    className="btn-premium w-full mt-2 py-3 flex items-center justify-center gap-2 shadow-blue-500/10"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Matching Seats...
                      </>
                    ) : (
                      <>
                        <Search className="h-4.5 w-4.5" /> Track Seats
                      </>
                    )}
                  </Button>

                  {!datasetAvailable && (
                    <div className="rounded-xl border border-amber-250 bg-amber-50/50 p-3 text-center text-[10px] text-amber-700 leading-relaxed font-semibold">
                      ⚠️ Vacant Seat Tracker will become available after the official vacant seat matrix is published before each CAP Round.
                    </div>
                  )}
                </form>
              </div>

              {/* Results Window */}
              <div id="results" className="scroll-mt-24">
                {results === null ? (
                  <div className="glass-card flex h-full min-h-80 flex-col items-center justify-center rounded-3xl border border-slate-200 p-10 text-center relative overflow-hidden bg-white/80">
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 filter blur-3xl" />
                    <BookOpen className="h-10 w-10 text-blue-600 relative z-10" />
                    <h3 className="mt-5 font-heading text-lg font-bold text-slate-900 relative z-10">
                      Live seat vacancies will appear here
                    </h3>
                    <p className="mt-2.5 max-w-sm text-xs text-slate-500 leading-relaxed relative z-10">
                      Fill in your quota, round choices and click Track Seats. We analyze the matrix to display available college seat openings.
                    </p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="glass-card flex h-full min-h-80 flex-col items-center justify-center rounded-3xl border border-slate-200 p-10 text-center relative overflow-hidden bg-white/80">
                    <Info className="h-10 w-10 text-slate-400" />
                    <h3 className="mt-5 font-heading text-lg font-bold text-slate-900">No available seats found</h3>
                    <p className="mt-2.5 max-w-sm text-xs text-slate-500 leading-relaxed">
                      Try updating your category filters, selecting additional branches, or tracking another CAP Round.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Disclaimer box above results */}
                    <div className="rounded-2xl border border-slate-250 bg-slate-50 p-4 text-xs text-slate-500 leading-relaxed space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                        Disclaimer
                      </div>
                      <p>
                        Vacant Seat Tracker displays provisional seat availability based on the officially published Maharashtra State CET Cell vacant seat matrix for the selected CAP Round. Seat availability may change during the admission process as candidates confirm admissions. AdmitWise is an independent educational platform and is not affiliated with or endorsed by the Maharashtra State CET Cell. Students should always verify the latest seat matrix and admission notifications on the official CET Cell website before participating in CAP counselling.
                      </p>
                    </div>

                    {/* Advanced Search Panel */}
                    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_200px]">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Results</span>
                        <Input
                          type="text"
                          placeholder="Search by college, code, branch, etc..."
                          value={searchQuery}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                          className="h-10 text-xs border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search By Field</span>
                        <Select value={searchBy} onValueChange={(v) => v && setSearchBy(v)}>
                          <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 shadow-md">
                            {SEARCH_BY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Results header & Sorters bar */}
                    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                            Top {filteredResults.length} Available Vacancies
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">Showing vacant college choices matching criteria.</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sort List By</span>
                          <Select value={sortKey} onValueChange={(v) => v && setSortKey(v as any)}>
                            <SelectTrigger className="w-52 border-slate-200 bg-white text-slate-800 rounded-xl h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 shadow-md">
                              <SelectItem value="priority">Priority Matched (Default)</SelectItem>
                              <SelectItem value="seats">Highest Available Seats</SelectItem>
                              <SelectItem value="name">College Name (A–Z)</SelectItem>
                              <SelectItem value="branch">Branch</SelectItem>
                              <SelectItem value="type">Institute Type</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Paginated cards */}
                    {resultsView}

                    {/* Load More pagination button */}
                    {filteredResults.length > visibleCount && (
                      <div className="flex justify-center pt-4">
                        <button
                          onClick={() => setVisibleCount((prev) => prev + 40)}
                          className="px-6 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold shadow-sm transition duration-300 text-xs"
                        >
                          Show More Colleges (+40)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      {showUpgradePopup && (
        <UpgradePopup
          onClose={() => setShowUpgradePopup(false)}
          onAddonPurchased={() => {
            setShowUpgradePopup(false)
            syncWithDatabase()
          }}
        />
      )}
    </div>
  )
}

// Memoized Single Card component to prevent heavy rendering cycle overheads
const ResultCard = React.memo(function ResultCard({
  result,
}: {
  result: SeatResult
}) {
  const isLimited = result.availableSeats > 0 && result.availableSeats <= 2

  return (
    <div className="glass-card rounded-2xl border border-slate-200 p-6 shadow-md hover:border-blue-250 hover:shadow-lg transition duration-300 relative overflow-hidden bg-white/90">
      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] rounded-lg">
              Code #{result.instituteCode}
            </Badge>
            <Badge variant="secondary" className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] rounded-lg">
              {result.instituteType}
            </Badge>
            <Badge variant="outline" className="border-indigo-200 text-indigo-700 text-[10px] rounded-lg">
              {result.homeUniversity}
            </Badge>
          </div>

          <h3 className="mt-4 flex items-start gap-2.5 text-base font-bold text-slate-900 leading-snug">
            <Building2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            {result.instituteName}
          </h3>

          <div className="mt-2.5 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-4.5 w-4.5 text-slate-400" />
              {result.courseName}
            </span>
            <span className="font-semibold text-slate-450">Choice Code: {result.choiceCode}</span>
          </div>
        </div>

        {/* Available seats indicator stats panel */}
        <div className="grid w-full gap-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 lg:w-72 lg:grid-cols-1">
          {result.matchedThrough && (
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-[10px] text-slate-450 font-semibold uppercase">Matched Through</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-right leading-tight max-w-[150px] break-words">
                {result.matchedThrough}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-[10px] text-slate-450 font-semibold uppercase">Matched Seat Category</span>
            <span className="text-xs font-bold text-slate-805 bg-slate-200/50 px-2 py-0.5 rounded-md font-mono">{result.seatCategory}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-450 font-semibold uppercase">CAP Admission Round</span>
            <span className="text-xs font-bold text-slate-805">{result.round}</span>
          </div>

          {/* Dynamic Available Seats alert badges */}
          <div className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold w-full border transition-all duration-300 bg-white">
            {isLimited ? (
              <span className="text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1 flex items-center justify-center gap-1.5 w-full">
                <AlertTriangle className="h-4 w-4 text-amber-500 animate-bounce" />
                {result.seatLabel || "Available Seats"}: {result.availableSeats}
              </span>
            ) : (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1 flex items-center justify-center gap-1.5 w-full">
                <CheckSquare className="h-4 w-4 text-emerald-500" />
                {result.seatLabel || "Available Seats"}: {result.availableSeats}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
