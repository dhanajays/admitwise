"use client"

import { useMemo, useState, useEffect, useTransition } from "react"
import { Loader2, Sparkles, Lock } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"

import { runPrediction } from "@/app/predictor/actions"
import type { PredictionResult, StudentInput } from "@/lib/predictor/types"
import {
  addProfile,
  getSubscription,
  isSubscribed,
  syncWithDatabase,
} from "@/lib/subscription/store"
import { calculateUnifiedStats } from "@/lib/subscription/limits"
import type { UserSubscription } from "@/lib/subscription/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Results } from "./results"
import { UpgradePopup } from "@/components/plans/upgrade-popup"

interface Options {
  exams: string[]
  categories: string[]
  branches: { id: string; name: string }[]
  universities: string[]
  stages: string[]
}

const genders = ["Male", "Female", "Do not wish to specify"] as const

const disabilityTypes = [
  "Locomotor Disability",
  "Hearing Impairment",
  "Visual Impairment",
  "Speech & Language Disability",
  "Intellectual Disability",
  "Autism Spectrum Disorder",
  "Cerebral Palsy",
  "Multiple Disabilities",
]

function stageLabel(stage: string) {
  const map: Record<string, string> = {
    I: "CAP Round I",
    II: "CAP Round II",
    III: "CAP Round III",
    IV: "CAP Round IV",
  }
  return map[stage] ?? stage
}

function formatProfileLabel(p: { exam: string; percentile: number; round?: string | null }, hideRound = false): string {
  const roundSuffix = p.round && !hideRound ? ` (Round ${p.round})` : ""
  if (p.exam === "NEET") return `NEET – ${p.percentile} Marks${roundSuffix}`
  return `${p.exam} – ${Number(p.percentile).toFixed(2)}%${roundSuffix}`
}

export function PredictorForm({ options }: { options: Options }) {
  const { data: session } = useSession()
  const [isPending, startTransition] = useTransition()
  const [results, setResults] = useState<PredictionResult[] | null>(null)
  const [lastInput, setLastInput] = useState<StudentInput | null>(null)
  const [showUpgradePopup, setShowUpgradePopup] = useState(false)
  const [sub, setSub] = useState<UserSubscription | null>(null)
  
  // Subscription status declared at top to avoid Temporal Dead Zone (TDZ)
  const subscribed = sub ? sub.maxProfiles > 0 && !!sub.activatedAt : false



  // MHT CET Predictor states
  const [selectedProfileId, setSelectedProfileId] = useState("")
  const [percentileInput, setPercentileInput] = useState("")

  // All India Predictor states
  const [useJeeMain, setUseJeeMain] = useState(false)
  const [selectedJeeProfileId, setSelectedJeeProfileId] = useState("")
  const [jeeNewPercentile, setJeeNewPercentile] = useState("")

  const [useNeet, setUseNeet] = useState(false)
  const [selectedNeetProfileId, setSelectedNeetProfileId] = useState("")
  const [neetNewPercentile, setNeetNewPercentile] = useState("")

  const [useMhtCet, setUseMhtCet] = useState(false)
  const [selectedMhtProfileId, setSelectedMhtProfileId] = useState("")
  const [mhtNewPercentile, setMhtNewPercentile] = useState("")
  // The MHT-CET exam name used specifically for All India prediction (PCM/PCB/etc.)
  // Kept separate from form.exam which belongs to the MHT CET predictor tab
  const [mhtCetAiExam, setMhtCetAiExam] = useState<string>("")

  const defaultExam = options.exams[0] ?? "MHT CET PCM"
  const defaultStage = options.stages[0] ?? "I"

  const [form, setForm] = useState<StudentInput>({
    predictionType: "mht-cet",
    examsList: [],
    exam: defaultExam,
    percentile: 95,
    gender: "Male",
    category: options.categories[0] ?? "OPEN",
    homeUniversity: options.universities[0] ?? "",
    stage: defaultStage,
    disability: false,
    defenseQuota: false,
    preferredBranches: [],
  })

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

    return () => {
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  // Calculate unified stats
  const stats = useMemo(() => {
    if (!sub) return null
    return calculateUnifiedStats(
      sub.plan,
      sub.maxProfiles,
      sub.trackerMaxProfiles,
      sub.profiles,
      []
    )
  }, [sub])

  const activeMhtProfile = useMemo(() => {
    return sub?.profiles.find(p => p.id === selectedProfileId)
  }, [sub, selectedProfileId])

  const isRoundLocked = useMemo(() => {
    return !!(sub?.plan === "single" && activeMhtProfile)
  }, [sub, activeMhtProfile])

  // Automatic profile selection for Predictor
  useEffect(() => {
    if (!sub || !stats) return
    if (form.predictionType === "mht-cet") {
      const mhtCetProfiles = sub.profiles.filter(
        (p) => p.predictionType === "mht-cet" || (!p.exam.includes("JEE") && !p.exam.includes("NEET"))
      )
      if (stats.mhtCet.used >= stats.mhtCet.max && mhtCetProfiles.length > 0) {
        const alreadySelected = mhtCetProfiles.some((p) => p.id === selectedProfileId)
        if (!alreadySelected) {
          const active = mhtCetProfiles[0]
          setSelectedProfileId(active.id)
          setPercentileInput(String(active.percentile))
          setForm((prev) => ({
            ...prev,
            percentile: active.percentile,
            exam: active.exam,
            stage: active.round || prev.stage,
            gender: (active.gender || prev.gender) as any,
            category: active.category || prev.category,
            homeUniversity: active.homeUniversity || prev.homeUniversity,
            disability: active.disability || prev.disability,
            defenseQuota: active.defenseQuota || prev.defenseQuota,
            preferredBranches: active.preferredBranches || prev.preferredBranches,
          }))
        }
      }
    } else {
      const jeeProfiles = sub.profiles.filter((p) => p.exam === "JEE(Main)")
      const neetProfiles = sub.profiles.filter((p) => p.exam === "NEET")
      const mhtProfiles = sub.profiles.filter(
        (p) => p.predictionType === "mht-cet" || (!p.exam.includes("JEE") && !p.exam.includes("NEET"))
      )

      if (jeeProfiles.length > 0 && !selectedJeeProfileId) {
        setSelectedJeeProfileId(jeeProfiles[0].id)
        setUseJeeMain(true)
      }
      if (neetProfiles.length > 0 && !selectedNeetProfileId) {
        setSelectedNeetProfileId(neetProfiles[0].id)
        setUseNeet(true)
      }
      if (mhtProfiles.length > 0 && !selectedMhtProfileId) {
        setSelectedMhtProfileId(mhtProfiles[0].id)
        setUseMhtCet(true)
      }
    }
  }, [form.predictionType, sub, stats])

  // Reset selected profile dropdown when predictionType changes
  useEffect(() => {
    setSelectedProfileId("")
  }, [form.predictionType])

  const set = <K extends keyof StudentInput>(key: K, value: StudentInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

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

  // Memoize results rendering to prevent form inputs from triggering heavy list diffing re-renders
  const resultsView = useMemo(() => {
    if (results === null || !lastInput) return null
    const enteredExams =
      lastInput.predictionType === "all-india" && lastInput.examsList
        ? lastInput.examsList.map((e) => e.exam)
        : []
    return (
      <Results
        results={results}
        preferredBranches={lastInput.preferredBranches}
        enteredExams={enteredExams}
        input={lastInput}
        isPaid={subscribed}
      />
    )
  }, [results, lastInput, subscribed])

  const handlePredict = (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Auth check
    if (!session || !session.user) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
      return
    }

    const isUserPaid = isSubscribed()

    const activeSub = sub || getSubscription()
    const activeStats = stats || calculateUnifiedStats(
      activeSub.plan,
      activeSub.maxProfiles,
      activeSub.trackerMaxProfiles,
      activeSub.profiles,
      []
    )

    if (form.predictionType !== "all-india") {
      // MHT CET Predictor
      const parsedPercentile = parseFloat(percentileInput)
      const targetPercentile = isNaN(parsedPercentile) ? 0 : parsedPercentile

      if (!isUserPaid) {
        if (targetPercentile <= 0 || targetPercentile > 100) {
          alert("Please enter a valid percentile.")
          return
        }
        startTransition(async () => {
          const resolvedInput: StudentInput = {
            ...form,
            percentile: targetPercentile,
          }
          setLastInput(resolvedInput)
          const res = await runPrediction(resolvedInput)
          if (res.error) {
            alert(res.error)
            setResults([])
          } else {
            setResults(res.predictions)
          }
          requestAnimationFrame(() => {
            const resultsEl = document.getElementById("results")
            if (resultsEl) {
              resultsEl.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          })
        })
        return
      }

      const mhtCetProfiles = activeSub.profiles.filter(
        (p) => p.predictionType === "mht-cet" || (!p.exam.includes("JEE") && !p.exam.includes("NEET"))
      )
      const matchedProfile = mhtCetProfiles.find((p) => p.id === selectedProfileId)

      let currentPercentile = targetPercentile
      if (matchedProfile) {
        currentPercentile = matchedProfile.percentile
      } else {
        // Creating a new profile: check limits
        if (activeStats.mhtCet.remaining <= 0) {
          setShowUpgradePopup(true)
          return
        }

        // Save new MHT CET profile
        startTransition(async () => {
          try {
            const { profile } = await addProfile(
              form.exam,
              targetPercentile,
              "mht-cet",
              null,
              form.stage,
              form.gender,
              form.category,
              form.homeUniversity,
              form.disability,
              form.defenseQuota,
              form.preferredBranches
            )
            // Reload subscription state
            const updatedSub = await syncWithDatabase()
            setSub(updatedSub)
            setSelectedProfileId(profile.id)
          } catch (err: any) {
            alert(err.message || "Failed to save profile")
            return
          }
        })
      }

      // Run prediction
      startTransition(async () => {
        const resolvedInput: StudentInput = {
          ...form,
          percentile: currentPercentile,
        }
        setLastInput(resolvedInput)
        const res = await runPrediction(resolvedInput)
        if (res.error) {
          alert(res.error)
          setResults([])
        } else {
          setResults(res.predictions)
          syncWithDatabase().then((updated) => {
            setSub(updated)
          })
        }
        requestAnimationFrame(() => {
          document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" })
        })
      })
    } else {
      // All India Predictor

      // Validate that at least one exam score is selected/checked
      if (!useJeeMain && !useNeet && !useMhtCet) {
        alert("Please select at least one exam score to run prediction.")
        return
      }

      const examsList: Array<{ exam: string; percentile: number }> = []

      if (!isUserPaid) {
        // Validation for JEE(Main)
        if (useJeeMain) {
          const val = parseFloat(jeeNewPercentile)
          if (isNaN(val) || val < 0 || val > 100) {
            alert("Please enter a valid JEE(Main) percentile between 0 and 100.")
            return
          }
          examsList.push({ exam: "JEE(Main)", percentile: val })
        }

        // Validation for NEET
        if (useNeet) {
          const val = parseFloat(neetNewPercentile)
          if (isNaN(val) || val < 0 || val > 720) {
            alert("Please enter a valid NEET score between 0 and 720.")
            return
          }
          examsList.push({ exam: "NEET", percentile: val })
        }

        // Validation for MHT-CET (for All India)
        if (useMhtCet) {
          const val = parseFloat(mhtNewPercentile)
          if (isNaN(val) || val < 0 || val > 100) {
            alert("Please enter a valid MHT-CET percentile between 0 and 100.")
            return
          }
          examsList.push({ exam: mhtCetAiExam || options.exams[0] || "MHT CET PCM", percentile: val })
        }

        // Run prediction directly
        startTransition(async () => {
          const resolvedInput: StudentInput = {
            gender: form.gender,
            category: form.category,
            homeUniversity: form.homeUniversity,
            stage: form.stage,
            disability: form.disability,
            disabilityType: form.disabilityType,
            defenseQuota: form.defenseQuota,
            preferredBranches: form.preferredBranches,
            predictionType: "all-india",
            examsList,
            exam: examsList[0]?.exam || "JEE(Main)",
            percentile: examsList[0]?.percentile || 0,
          }
          setLastInput(resolvedInput)
          const res = await runPrediction(resolvedInput)
          if (res.error) {
            alert(res.error)
            setResults([])
          } else {
            setResults(res.predictions)
          }
          requestAnimationFrame(() => {
            const resultsEl = document.getElementById("results")
            if (resultsEl) {
              resultsEl.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          })
        })
        return
      }

      // 1. Validate JEE(Main)
      let jeePercentile = 0
      let saveJeeProfile = false
      if (useJeeMain) {
        const jeeProfiles = activeSub.profiles.filter((p) => p.exam === "JEE(Main)")
        const matchedJee = jeeProfiles.find((p) => p.id === selectedJeeProfileId)
        if (matchedJee) {
          jeePercentile = matchedJee.percentile
        } else {
          const val = parseFloat(jeeNewPercentile)
          if (isNaN(val) || val < 0 || val > 100) {
            alert("Please enter a valid JEE(Main) percentile between 0 and 100.")
            return
          }
          jeePercentile = val
          saveJeeProfile = true
          if (activeStats.jeeMain.remaining <= 0) {
            setShowUpgradePopup(true)
            return
          }
        }
        examsList.push({ exam: "JEE(Main)", percentile: jeePercentile })
      }

      // 2. Validate NEET
      let neetPercentile = 0
      let saveNeetProfile = false
      if (useNeet) {
        const neetProfiles = activeSub.profiles.filter((p) => p.exam === "NEET")
        const matchedNeet = neetProfiles.find((p) => p.id === selectedNeetProfileId)
        if (matchedNeet) {
          neetPercentile = matchedNeet.percentile
        } else {
          const val = parseFloat(neetNewPercentile)
          if (isNaN(val) || val < 0 || val > 720) {
            alert("Please enter a valid NEET score between 0 and 720.")
            return
          }
          neetPercentile = val
          saveNeetProfile = true
          if (activeStats.neet.remaining <= 0) {
            setShowUpgradePopup(true)
            return
          }
        }
        examsList.push({ exam: "NEET", percentile: neetPercentile })
      }

      // 3. Validate MHT-CET (for All India)
      let mhtPercentile = 0
      let saveMhtProfile = false
      if (useMhtCet) {
        const mhtProfiles = activeSub.profiles.filter(
          (p) => p.predictionType === "mht-cet" || (!p.exam.includes("JEE") && !p.exam.includes("NEET"))
        )
        const matchedMht = mhtProfiles.find((p) => p.id === selectedMhtProfileId)
        if (matchedMht) {
          mhtPercentile = matchedMht.percentile
        } else {
          const val = parseFloat(mhtNewPercentile)
          if (isNaN(val) || val < 0 || val > 100) {
            alert("Please enter a valid MHT-CET percentile between 0 and 100.")
            return
          }
          mhtPercentile = val
          saveMhtProfile = true
          if (activeStats.mhtCet.remaining <= 0) {
            setShowUpgradePopup(true)
            return
          }
        }
        examsList.push({ exam: mhtCetAiExam || options.exams[0] || "MHT CET PCM", percentile: mhtPercentile })
      }

      // Save profiles and run prediction
      startTransition(async () => {
        try {
          if (saveJeeProfile) {
            await addProfile(
              "JEE(Main)",
              jeePercentile,
              "all-india",
              null,
              form.stage,
              form.gender,
              form.category,
              form.homeUniversity,
              form.disability,
              form.defenseQuota,
              form.preferredBranches
            )
          }
          if (saveNeetProfile) {
            await addProfile(
              "NEET",
              neetPercentile,
              "all-india",
              null,
              form.stage,
              form.gender,
              form.category,
              form.homeUniversity,
              form.disability,
              form.defenseQuota,
              form.preferredBranches
            )
          }
          if (saveMhtProfile) {
            await addProfile(
              mhtCetAiExam || options.exams[0] || "MHT CET PCM",
              mhtPercentile,
              "mht-cet",
              null,
              form.stage,
              form.gender,
              form.category,
              form.homeUniversity,
              form.disability,
              form.defenseQuota,
              form.preferredBranches
            )
          }

          const updatedSub = await syncWithDatabase()
          setSub(updatedSub)
        } catch (err: any) {
          alert(err.message || "Failed to save profile or run prediction")
        }
      })

      // Run prediction
      startTransition(async () => {
        // Build resolvedInput cleanly — do NOT spread form.exam which belongs to MHT CET predictor tab
        const resolvedInput: StudentInput = {
          gender: form.gender,
          category: form.category,
          homeUniversity: form.homeUniversity,
          stage: form.stage,
          disability: form.disability,
          disabilityType: form.disabilityType,
          defenseQuota: form.defenseQuota,
          preferredBranches: form.preferredBranches,
          predictionType: "all-india",
          examsList,
          // exam = first checked exam (JEE/NEET/MHT-CET AI) — never bleeds from MHT CET predictor tab
          exam: examsList[0]?.exam || "JEE(Main)",
          percentile: examsList[0]?.percentile || 0,
        }
        setLastInput(resolvedInput)
        const res = await runPrediction(resolvedInput)
        if (res.error) {
          alert(res.error)
          setResults([])
        } else {
          setResults(res.predictions)
        }
        requestAnimationFrame(() => {
          document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" })
        })
      })
    }
  }

  // After add-on is purchased, close popup and re-run last prediction
  function handleAddonPurchased() {
    setShowUpgradePopup(false)
    const updatedSub = getSubscription()
    setSub(updatedSub)
  }

  // Subscription status resolved at top of component

  return (
    <>
      {showUpgradePopup && (
        <UpgradePopup
          onClose={() => setShowUpgradePopup(false)}
          onAddonPurchased={handleAddonPurchased}
        />
      )}

      <div className="grid gap-8 lg:grid-cols-[410px_1fr] relative z-10 animate-fade-in-up">
        {/* Absolute glow backing */}
        <div className="glow-blob -left-20 top-20 h-[300px] w-[300px] bg-blue-500/5" />

        <form
          onSubmit={handlePredict}
          className="glass-card h-fit rounded-2xl p-6 shadow-md lg:sticky lg:top-24 border border-slate-200 bg-white/90 backdrop-blur-sm"
        >
          <h2 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
            Student Profile
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            Enter accurate details to get better college predictions.
          </p>

          {/* Profile usage bar */}
          {sub && subscribed && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs">
                <span className="text-slate-500 text-[11px]">
                  Percentile Profiles:{" "}
                  <span className="font-semibold text-slate-900">
                    {sub.profiles.length} / {sub.maxProfiles} used
                  </span>
                </span>
                <Link
                  href="/dashboard"
                  className="text-blue-600 hover:text-blue-700 font-semibold transition"
                >
                </Link>
              </div>

              {sub.plan === "single" && (() => {
                const remaining = Math.max(0, sub.maxProfiles - sub.profiles.length)
                return (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-650 flex flex-col gap-1.5 w-full animate-fade-in shadow-sm">
                    <div className="grid grid-cols-3 gap-1 text-center text-[10px] bg-white/60 rounded-xl p-2 border border-blue-100/50">
                      <div>
                        <div className="text-slate-400 font-medium leading-none">Slots</div>
                        <div className="text-slate-700 font-bold text-xs mt-1">{sub.maxProfiles}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-medium leading-none">Used</div>
                        <div className="text-slate-700 font-bold text-xs mt-1">{sub.profiles.length}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-medium leading-none">Remaining</div>
                        <div className="text-slate-700 font-bold text-xs mt-1">{remaining}</div>
                      </div>
                    </div>
                    
                    {remaining > 0 ? (
                      <div className="text-[11px] text-blue-755 font-medium leading-relaxed mt-1">
                        ✅ You have {remaining} unused Single Predictor available.<br/>
                        <span className="text-slate-500 font-normal">Select any CAP Round to continue.</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-600 font-semibold leading-relaxed mt-1">
                        All Single Predictor slots have been used.<br/>
                        <span className="text-slate-500 font-normal">Purchase another ₹499 plan or upgrade to the Multi-Round plan.</span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {!subscribed && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
              <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span className="text-[11px] font-medium">
                Free Preview Mode Active. Predict to see your top 5 colleges.
              </span>
            </div>
          )}

          {/* Prediction Type Selector */}
          <div className="space-y-1.5 mt-6">
            <Label className="text-xs font-semibold text-slate-650">Prediction Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set("predictionType", "mht-cet")}
                className={`rounded-xl border py-2.5 text-xs font-semibold transition-all duration-300 ${
                  form.predictionType !== "all-india"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10"
                    : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                }`}
              >
                MHT CET Predictor
              </button>
              <button
                type="button"
                onClick={() => set("predictionType", "all-india")}
                className={`rounded-xl border py-2.5 text-xs font-semibold transition-all duration-300 ${
                  form.predictionType === "all-india"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10"
                    : "bg-white text-slate-655 border-slate-200 hover:bg-slate-50"
                }`}
              >
                All India Seat Predictor
              </button>
            </div>
          </div>

          {/* Unified Exam, Round and Score Fields */}
          <div className="mt-6 space-y-4">
            {form.predictionType !== "all-india" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Exam">
                    <Select value={form.exam} onValueChange={(v) => v && set("exam", v)}>
                      <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition duration-300">
                        <SelectValue placeholder="Select exam" />
                      </SelectTrigger>
                      <SelectContent className="border-slate-200 bg-white shadow-lg">
                        {options.exams.map((exam) => (
                          <SelectItem key={exam} value={exam}>
                            {exam}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="CAP Round">
                    <Select
                      value={form.stage}
                      onValueChange={(v) => v && set("stage", v)}
                      disabled={isRoundLocked}
                    >
                      <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition duration-300">
                        <SelectValue placeholder="Select round" />
                      </SelectTrigger>
                      <SelectContent className="border-slate-200 bg-white shadow-lg">
                        {options.stages.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stageLabel(stage)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="col-span-2">
                  {(() => {
                    if (!sub || !stats) return null
                    const mhtCetStats = stats.mhtCet
                    const mhtCetProfiles = sub.profiles.filter(
                      (p) => p.predictionType === "mht-cet" || (!p.exam.includes("JEE") && !p.exam.includes("NEET"))
                    )

                    if (mhtCetStats.used >= mhtCetStats.max && mhtCetProfiles.length > 0) {
                      return (
                        <div className="space-y-1.5 animate-fade-in">
                          <Label className="text-xs font-semibold text-slate-655">Select Saved Percentile (Locked)</Label>
                          <Select
                            value={selectedProfileId}
                            onValueChange={(val) => {
                              if (val) {
                                setSelectedProfileId(val)
                                const p = mhtCetProfiles.find((x) => x.id === val)
                                if (p) {
                                  setPercentileInput(String(p.percentile))
                                  setForm((prev) => ({
                                    ...prev,
                                    exam: p.exam || prev.exam,
                                    percentile: p.percentile,
                                    category: p.category || prev.category,
                                    gender: (p.gender as any) || prev.gender,
                                    homeUniversity: p.homeUniversity || prev.homeUniversity,
                                    stage: p.round || prev.stage,
                                    preferredBranches: p.preferredBranches || prev.preferredBranches,
                                  }))
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="border-slate-200 bg-slate-50 text-slate-800 rounded-xl">
                              <SelectValue>
                                {(() => {
                                  const sel = mhtCetProfiles.find((x) => x.id === selectedProfileId)
                                  return sel ? formatProfileLabel(sel) : "Select locked profile"
                                })()}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 shadow-lg">
                              {mhtCetProfiles.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.exam} · {Number(p.percentile).toFixed(2)}% (Round {p.round || "I"})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-amber-600 font-semibold mt-1">
                            🔒 Used: {mhtCetStats.used}/{mhtCetStats.max} slots. Remaining: {mhtCetStats.remaining} slots. All profile slots are locked.
                          </p>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-4">
                        {mhtCetProfiles.length > 0 && (
                          <div className="space-y-1.5 animate-fade-in">
                            <Label className="text-xs font-semibold text-slate-655">Select Saved Percentile</Label>
                            <Select
                              value={selectedProfileId}
                              onValueChange={(val) => {
                                if (val) {
                                  setSelectedProfileId(val)
                                  if (val === "new") {
                                    setPercentileInput("")
                                    set("percentile", 0)
                                  } else {
                                    const p = mhtCetProfiles.find((x) => x.id === val)
                                    if (p) {
                                      setPercentileInput(String(p.percentile))
                                      setForm((prev) => ({
                                        ...prev,
                                        exam: p.exam || prev.exam,
                                        percentile: p.percentile,
                                        category: p.category || prev.category,
                                        gender: (p.gender as any) || prev.gender,
                                        homeUniversity: p.homeUniversity || prev.homeUniversity,
                                        stage: p.round || prev.stage,
                                        preferredBranches: p.preferredBranches || prev.preferredBranches,
                                      }))
                                    }
                                  }
                                }
                              }}
                            >
                              <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl">
                                <SelectValue>
                                  {(() => {
                                    if (selectedProfileId === "new") return "+ Create new percentile profile..."
                                    const sel = mhtCetProfiles.find((x) => x.id === selectedProfileId)
                                    return sel ? formatProfileLabel(sel) : "Select Saved Percentile"
                                  })()}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 shadow-lg">
                                {mhtCetProfiles.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.exam} – {Number(p.percentile).toFixed(2)}% (Round {p.round || "I"})
                                  </SelectItem>
                                ))}
                                <SelectItem value="new">+ Create new percentile profile...</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {(selectedProfileId === "new" || selectedProfileId === "" || mhtCetProfiles.length === 0) && (
                          <Field label="Percentile">
                            <Input
                              type="number"
                              step="0.000001"
                              min={0}
                              max={100}
                              placeholder="Enter percentile"
                              value={percentileInput}
                              onChange={(e) => setPercentileInput(e.target.value)}
                              className="border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition duration-300"
                            />
                            <p className="text-[10px] text-slate-500 leading-relaxed mt-1 bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                              Used: {mhtCetStats.used}/{mhtCetStats.max} slots. Remaining: {mhtCetStats.remaining} slots.
                              <br />
                              {mhtCetStats.max === 1 ? (
                                <>Write your percentile carefully. Once your first prediction is made, this percentile becomes permanent and cannot be changed under this plan.</>
                              ) : (
                                <>You can create up to {mhtCetStats.max} percentile profiles. After all are used, no additional percentile can be added.</>
                              )}
                            </p>
                          </Field>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </>
            ) : (
              /* All India Predictor — Exam Scores Section */
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="CAP Round">
                    <Select
                      value={form.stage}
                      onValueChange={(v) => v && set("stage", v)}
                    >
                      <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition duration-300">
                        <SelectValue placeholder="Select round" />
                      </SelectTrigger>
                      <SelectContent className="border-slate-200 bg-white shadow-lg">
                        {["I", "II", "III", "IV"].map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stageLabel(stage)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                {stats && sub && (
                  <div className="col-span-2 space-y-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-slate-800">Select Exam Scores</Label>
                    </div>

                    <p className="text-[11px] text-slate-500 bg-white border border-slate-100 p-2.5 rounded-lg leading-relaxed">
                      Enter your JEE(Main) and NEET scores carefully. Once the available profile limit is exhausted, they cannot be changed under this plan.
                    </p>

                    <div className="space-y-4 mt-3">
                      {/* JEE(Main) Card */}
                      <div className="border border-slate-200 bg-white p-4 rounded-xl shadow-sm space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={useJeeMain}
                            onChange={(e) => setUseJeeMain(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 bg-white accent-blue-600 cursor-pointer"
                          />
                          JEE(Main) Score
                        </label>

                        {useJeeMain && (() => {
                          const jeeProfiles = sub.profiles.filter((p) => p.exam === "JEE(Main)")
                          const jeeStats = stats.jeeMain

                          if (jeeStats.used >= jeeStats.max && jeeProfiles.length > 0) {
                            return (
                              <div className="space-y-1.5 pl-6 animate-fade-in">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Saved Percentile</Label>
                                <Select
                                  value={selectedJeeProfileId}
                                  onValueChange={(val) => val && setSelectedJeeProfileId(val)}
                                >
                                  <SelectTrigger className="border-slate-200 bg-slate-50 text-slate-800 rounded-lg">
                                    <SelectValue>
                                      {(() => {
                                        const sel = jeeProfiles.find((x) => x.id === selectedJeeProfileId)
                                        return sel ? formatProfileLabel(sel, true) : "Select Saved Percentile"
                                      })()}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-slate-200">
                                    {jeeProfiles.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        JEE(Main) – {Number(p.percentile).toFixed(2)}% (Locked)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-[10px] text-amber-600 font-semibold">
                                  🔒 Used: {jeeStats.used}/{jeeStats.max} slots. Remaining: {jeeStats.remaining} slots. All JEE(Main) profiles are locked.
                                </p>
                              </div>
                            )
                          }

                          return (
                            <div className="space-y-3 pl-6 animate-fade-in">
                              {jeeProfiles.length > 0 && (
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Saved Percentile</Label>
                                  <Select
                                    value={selectedJeeProfileId}
                                    onValueChange={(val) => {
                                      if (val) {
                                        setSelectedJeeProfileId(val)
                                        if (val === "new") setJeeNewPercentile("")
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="border-slate-200 rounded-lg">
                                      <SelectValue>
                                        {(() => {
                                          if (selectedJeeProfileId === "new") return "+ Enter new JEE(Main) percentile..."
                                          const sel = jeeProfiles.find((x) => x.id === selectedJeeProfileId)
                                          return sel ? formatProfileLabel(sel, true) : "Select Saved Percentile"
                                        })()}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-slate-200">
                                      {jeeProfiles.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                          JEE(Main) – {Number(p.percentile).toFixed(2)}%
                                        </SelectItem>
                                      ))}
                                      <SelectItem value="new">+ Enter new JEE(Main) percentile...</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {(selectedJeeProfileId === "new" || selectedJeeProfileId === "" || jeeProfiles.length === 0) && (
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">JEE(Main) Percentile</Label>
                                  <Input
                                    type="number"
                                    step="0.000001"
                                    min={0}
                                    max={100}
                                    placeholder="Enter JEE(Main) percentile"
                                    value={jeeNewPercentile}
                                    onChange={(e) => setJeeNewPercentile(e.target.value)}
                                    className="text-xs border-slate-200 rounded-lg"
                                  />
                                  <p className="text-[10px] text-slate-400 leading-normal">
                                    Used: {jeeStats.used}/{jeeStats.max} slots. Remaining: {jeeStats.remaining} slots.
                                  </p>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      {/* NEET Card */}
                      <div className="border border-slate-200 bg-white p-4 rounded-xl shadow-sm space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={useNeet}
                            onChange={(e) => setUseNeet(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 bg-white accent-blue-600 cursor-pointer"
                          />
                          NEET Score
                        </label>

                        {useNeet && (() => {
                          const neetProfiles = sub.profiles.filter((p) => p.exam === "NEET")
                          const neetStats = stats.neet

                          if (neetStats.used >= neetStats.max && neetProfiles.length > 0) {
                            return (
                              <div className="space-y-1.5 pl-6 animate-fade-in">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Saved Percentile</Label>
                                <Select
                                  value={selectedNeetProfileId}
                                  onValueChange={(val) => val && setSelectedNeetProfileId(val)}
                                >
                                  <SelectTrigger className="border-slate-200 bg-slate-50 text-slate-800 rounded-lg">
                                    <SelectValue>
                                      {(() => {
                                        const sel = neetProfiles.find((x) => x.id === selectedNeetProfileId)
                                        return sel ? formatProfileLabel(sel, true) : "Select Saved Percentile"
                                      })()}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-slate-200">
                                    {neetProfiles.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        NEET – {p.percentile} (Locked)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-[10px] text-amber-600 font-semibold">
                                  🔒 Used: {neetStats.used}/{neetStats.max} slots. Remaining: {neetStats.remaining} slots. All NEET profiles are locked.
                                </p>
                              </div>
                            )
                          }

                          return (
                            <div className="space-y-3 pl-6 animate-fade-in">
                              {neetProfiles.length > 0 && (
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Saved Percentile</Label>
                                  <Select
                                    value={selectedNeetProfileId}
                                    onValueChange={(val) => {
                                      if (val) {
                                        setSelectedNeetProfileId(val)
                                        if (val === "new") setNeetNewPercentile("")
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="border-slate-200 rounded-lg">
                                      <SelectValue>
                                        {(() => {
                                          if (selectedNeetProfileId === "new") return "+ Enter new NEET percentile/marks..."
                                          const sel = neetProfiles.find((x) => x.id === selectedNeetProfileId)
                                          return sel ? formatProfileLabel(sel, true) : "Select Saved Percentile"
                                        })()}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-slate-200">
                                      {neetProfiles.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                          NEET – {p.percentile}
                                        </SelectItem>
                                      ))}
                                      <SelectItem value="new">+ Enter new NEET percentile/marks...</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {(selectedNeetProfileId === "new" || selectedNeetProfileId === "" || neetProfiles.length === 0) && (
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NEET Percentile / Marks</Label>
                                  <Input
                                    type="number"
                                    step="0.000001"
                                    min={0}
                                    placeholder="Enter NEET score"
                                    value={neetNewPercentile}
                                    onChange={(e) => setNeetNewPercentile(e.target.value)}
                                    className="text-xs border-slate-200 rounded-lg"
                                  />
                                  <p className="text-[10px] text-slate-400 leading-normal">
                                    Used: {neetStats.used}/{neetStats.max} slots. Remaining: {neetStats.remaining} slots.
                                  </p>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      {/* MHT-CET Card */}
                      <div className="border border-slate-200 bg-white p-4 rounded-xl shadow-sm space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={useMhtCet}
                            onChange={(e) => setUseMhtCet(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 bg-white accent-blue-600 cursor-pointer"
                          />
                          MHT-CET Score
                        </label>

                        {useMhtCet && (() => {
                          const mhtProfiles = sub.profiles.filter(
                            (p) => p.predictionType === "mht-cet" || (!p.exam.includes("JEE") && !p.exam.includes("NEET"))
                          )
                          const mhtStats = stats.mhtCet

                          if (mhtStats.used >= mhtStats.max && mhtProfiles.length > 0) {
                            return (
                              <div className="space-y-1.5 pl-6 animate-fade-in">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Saved Percentile</Label>
                                <Select
                                  value={selectedMhtProfileId}
                                  onValueChange={(val) => val && setSelectedMhtProfileId(val)}
                                >
                                  <SelectTrigger className="border-slate-200 bg-slate-50 text-slate-800 rounded-lg">
                                    <SelectValue>
                                      {(() => {
                                        const sel = mhtProfiles.find((x) => x.id === selectedMhtProfileId)
                                        return sel ? formatProfileLabel(sel, true) : "Select Saved Percentile"
                                      })()}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-slate-200">
                                    {mhtProfiles.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        MHT-CET – {Number(p.percentile).toFixed(2)}% (Locked)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-[10px] text-amber-600 font-semibold">
                                  🔒 Used: {mhtStats.used}/{mhtStats.max} slots. Remaining: {mhtStats.remaining} slots. All MHT-CET profiles are locked.
                                </p>
                              </div>
                            )
                          }

                          return (
                            <div className="space-y-3 pl-6 animate-fade-in">
                              {mhtProfiles.length > 0 && (
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Saved Percentile</Label>
                                  <Select
                                    value={selectedMhtProfileId}
                                    onValueChange={(val) => {
                                      if (val) {
                                        setSelectedMhtProfileId(val)
                                        if (val === "new") setMhtNewPercentile("")
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="border-slate-200 rounded-lg">
                                      <SelectValue>
                                        {(() => {
                                          if (selectedMhtProfileId === "new") return "+ Enter new MHT-CET percentile..."
                                          const sel = mhtProfiles.find((x) => x.id === selectedMhtProfileId)
                                          return sel ? formatProfileLabel(sel, true) : "Select Saved Percentile"
                                        })()}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-slate-200">
                                      {mhtProfiles.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                          MHT-CET – {Number(p.percentile).toFixed(2)}%
                                        </SelectItem>
                                      ))}
                                      <SelectItem value="new">+ Enter new MHT-CET percentile...</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {(selectedMhtProfileId === "new" || selectedMhtProfileId === "" || mhtProfiles.length === 0) && (
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MHT-CET Percentile</Label>
                                  <Input
                                    type="number"
                                    step="0.000001"
                                    min={0}
                                    max={100}
                                    placeholder="Enter MHT-CET percentile"
                                    value={mhtNewPercentile}
                                    onChange={(e) => setMhtNewPercentile(e.target.value)}
                                    className="text-xs border-slate-200 rounded-lg"
                                  />
                                  <p className="text-[10px] text-slate-400 leading-normal">
                                    Used: {mhtStats.used}/{mhtStats.max} slots. Remaining: {mhtStats.remaining} slots.
                                  </p>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Common Fields: Category, Gender, University, etc. */}
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <Select value={form.category} onValueChange={(v) => v && set("category", v)}>
                  <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition duration-300">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white shadow-lg">
                    {options.categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Gender">
                <Select value={form.gender} onValueChange={(v) => v && set("gender", v as any)}>
                  <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition duration-300">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white shadow-lg">
                    {genders.map((gender) => (
                      <SelectItem key={gender} value={gender}>
                        {gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Home University">
              <Select
                value={form.homeUniversity}
                onValueChange={(v) => v && set("homeUniversity", v)}
              >
                <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 transition duration-300">
                  <SelectValue placeholder="Select home university" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white shadow-lg !w-auto !min-w-(--anchor-width) !max-w-[90vw] md:!max-w-[450px]">
                  {options.universities.map((uni) => (
                    <SelectItem key={uni} value={uni}>
                      {uni}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-300">
              <label className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                Person with disability (PwD)
                <input
                  type="checkbox"
                  checked={form.disability}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      disability: e.target.checked,
                      disabilityType: e.target.checked
                        ? prev.disabilityType ?? disabilityTypes[0]
                        : undefined,
                    }))
                  }
                  className="h-4 w-4 rounded-lg border-slate-300 bg-white accent-blue-600 cursor-pointer"
                />
              </label>

              {form.disability && (
                <div className="mt-3.5">
                  <Select
                    value={form.disabilityType ?? disabilityTypes[0]}
                    onValueChange={(v) => set("disabilityType", v || undefined)}
                  >
                    <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500">
                      <SelectValue placeholder="Select disability type" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white shadow-lg">
                      {disabilityTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-300">
              <label className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                Defence Quota
                <input
                  type="checkbox"
                  checked={form.defenseQuota}
                  onChange={(e) => set("defenseQuota", e.target.checked)}
                  className="h-4 w-4 rounded-lg border-slate-300 bg-white accent-blue-600 cursor-pointer"
                />
              </label>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-slate-800">
                Preferred Branches
              </div>
              <div className="rounded-xl border border-slate-200 p-3 max-h-48 overflow-y-auto space-y-1.5 bg-slate-50/50">
                {options.branches.map((branch) => {
                  const checked = form.preferredBranches.includes(branch.name)
                  return (
                    <label
                      key={branch.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition duration-300"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBranch(branch.name)}
                        className="h-4 w-4 rounded-lg border-slate-300 bg-white accent-blue-600 cursor-pointer"
                      />
                      <span>{branch.name}</span>
                    </label>
                  )
                })}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                Leave blank to consider all branches.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-premium w-full mt-6 flex items-center justify-center gap-2 py-3 shadow-blue-500/10"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Predicting chances...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Predict My Colleges
              </>
            )}
          </button>
        </form>

        <div id="results" className="scroll-mt-24">
          {results === null ? (
            <div className="glass-card flex h-full min-h-80 flex-col items-center justify-center rounded-2xl border border-slate-200 p-10 text-center relative overflow-hidden bg-white/80">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 filter blur-2xl" />
              <Sparkles className="h-10 w-10 text-blue-600 relative z-10" />
              <h3 className="mt-5 font-heading text-lg font-bold text-slate-900 relative z-10">
                Your predictions will appear here
              </h3>
              <p className="mt-2.5 max-w-sm text-xs text-slate-500 leading-relaxed relative z-10">
                Fill in your profile and click predict. We compare your inputs
                against official historical cutoffs to rank the best-fit
                colleges.
              </p>
            </div>
          ) : (
            resultsView
          )}
        </div>
      </div>
    </>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600">
        {label}
      </Label>
      {children}
    </div>
  )
}