"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ClipboardList,
  Sparkles,
  Lock,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  GraduationCap,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react"
import { PrioritySelector } from "@/components/preference-generator/priority-selector"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import type { PreferenceResultItem } from "@/lib/preference-generator/types"
import { loadRazorpayScript } from "@/lib/razorpay-client"

const CAP_ROUNDS = ["Round 1", "Round 2", "Round 3", "Round 4"]

export default function PreferenceListGeneratorPage() {
  const { data: session } = useSession()

  // Form states
  const [exam, setExam] = useState("MHT CET (PCM)")
  const [percentile, setPercentile] = useState<string>("")
  const [capRound, setCapRound] = useState("Round 1")
  const [preferredBranches, setPreferredBranches] = useState<string[]>([])
  const [preferredCities, setPreferredCities] = useState<string[]>(["ANY"])

  // Dataset Options (fetched dynamically)
  const [availableBranches, setAvailableBranches] = useState<string[]>([])
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [datasetInfo, setDatasetInfo] = useState<any>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)

  // Purchase & Result states
  const [isPaid, setIsPaid] = useState(false)
  const [isIncludedInPlan, setIsIncludedInPlan] = useState(false)
  const [planName, setPlanName] = useState<string>("")
  const [savedPercentile, setSavedPercentile] = useState<number | null>(null)
  const [allPurchases, setAllPurchases] = useState<any[]>([])
  const [predictorProfiles, setPredictorProfiles] = useState<number[]>([])
  const [results, setResults] = useState<PreferenceResultItem[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 1. Restore Form Draft after Login / Sign Up
  useEffect(() => {
    try {
      const savedDraftStr =
        sessionStorage.getItem("preferenceGeneratorDraft") ||
        localStorage.getItem("preferenceGeneratorDraft")

      if (savedDraftStr) {
        const draft = JSON.parse(savedDraftStr)
        sessionStorage.removeItem("preferenceGeneratorDraft")
        localStorage.removeItem("preferenceGeneratorDraft")

        if (draft.percentile) setPercentile(String(draft.percentile))
        if (draft.round) setCapRound(draft.round)
        if (draft.preferredBranches && Array.isArray(draft.preferredBranches) && draft.preferredBranches.length > 0) {
          setPreferredBranches(draft.preferredBranches)
        }
        if (draft.preferredCities && Array.isArray(draft.preferredCities) && draft.preferredCities.length > 0) {
          setPreferredCities(draft.preferredCities)
        }
      }
    } catch (e) {
      console.error("Error restoring preference generator draft:", e)
    }
  }, [])

  // 2. Fetch Predictor Saved Percentile Profiles
  useEffect(() => {
    async function fetchPredictorProfiles() {
      if (!session) return
      try {
        const res = await fetch("/api/subscription")
        if (res.ok) {
          const data = await res.json()
          if (data.profiles && Array.isArray(data.profiles)) {
            const list = data.profiles
              .map((p: any) => p.percentile)
              .filter((val: any) => typeof val === "number" && !isNaN(val))
            setPredictorProfiles(Array.from(new Set(list)))
          }
        }
      } catch (err) {
        console.error("Error fetching predictor profiles:", err)
      }
    }

    fetchPredictorProfiles()
  }, [session])

  // 3. Fetch Dynamic Branches & Cities for selected CAP Round
  useEffect(() => {
    async function fetchOptions() {
      setLoadingOptions(true)
      try {
        const res = await fetch(`/api/preference-generator/dataset?round=${encodeURIComponent(capRound)}`)
        console.log("[Frontend fetchOptions] Response status:", res.status)
        const textData = await res.clone().text()

        if (res.ok) {
          const data = JSON.parse(textData)
          if (data.error) {
            setErrorMsg(data.error)
            setAvailableBranches([])
            setAvailableCities(["ANY"])
            setDatasetInfo(null)
          } else {
            setErrorMsg(null)
            setAvailableBranches(data.branches || [])
            setAvailableCities(["ANY", ...(data.cities || [])])
            setDatasetInfo(data.datasetInfo || null)
            console.log("[Frontend fetchOptions] Received Branches:", (data.branches || []).length)
            console.log("[Frontend fetchOptions] Received Cities:", (data.cities || []).length)
          }
        } else {
          setErrorMsg(`Failed to load dataset (HTTP ${res.status})`)
        }
      } catch (err) {
        console.error("Error fetching dataset options:", err)
        setErrorMsg("Failed to load options for the selected CAP Round.")
      } finally {
        setLoadingOptions(false)
      }
    }

    fetchOptions()
  }, [capRound])

  // 4. Check Purchase status whenever session or capRound changes
  useEffect(() => {
    async function checkPurchase() {
      if (!session || !session.user) {
        setIsPaid(false)
        setIsIncludedInPlan(false)
        setPlanName("")
        setSavedPercentile(null)
        setAllPurchases([])
        return
      }

      try {
        const res = await fetch(`/api/preference-generator/purchase?round=${encodeURIComponent(capRound)}`)
        if (res.ok) {
          const data = await res.json()
          setAllPurchases(data.allPurchases || [])
          if (data.isPaid) {
            setIsIncludedInPlan(!!data.isIncludedInPlan)
            setPlanName(data.planName || "")
            if (data.purchase?.savedPercentile) {
              setSavedPercentile(data.purchase.savedPercentile)
              // Set percentile input to locked percentile if none typed yet
              if (!percentile) {
                setPercentile(data.purchase.savedPercentile.toFixed(2))
              }
            } else {
              setSavedPercentile(null)
            }
          } else {
            setIsPaid(false)
            setIsIncludedInPlan(false)
            setPlanName("")
            setSavedPercentile(null)
          }
        }
      } catch (err) {
        console.error("Error checking purchase status:", err)
      }
    }

    checkPurchase()
  }, [session, capRound])

  // 5. Handle Generate Preference List
  const handleGenerate = async (overridePercentile?: number) => {
    setErrorMsg(null)
    const targetPercentile = overridePercentile ?? parseFloat(percentile)

    if (isNaN(targetPercentile) || targetPercentile < 0 || targetPercentile > 100) {
      setErrorMsg("Please enter a valid MHT CET percentile between 0 and 100.")
      return
    }

    if (preferredBranches.length === 0) {
      setErrorMsg("Please select at least one preferred branch priority.")
      return
    }

    // Guest Authentication Flow: Save form draft & redirect to login if not logged in
    if (!session || !session.user) {
      const draft = {
        exam: "MHT CET PCM",
        percentile: String(targetPercentile),
        round: capRound,
        preferredBranches,
        preferredCities,
      }
      try {
        sessionStorage.setItem("preferenceGeneratorDraft", JSON.stringify(draft))
        localStorage.setItem("preferenceGeneratorDraft", JSON.stringify(draft))
      } catch (e) {
        console.error("Error saving draft to storage:", e)
      }

      window.location.href = `/login?callbackUrl=${encodeURIComponent("/preference-list-generator")}`
      return
    }

    setGenerating(true)
    try {
      const res = await fetch("/api/preference-generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percentile: targetPercentile,
          round: capRound,
          preferredBranches,
          preferredCities,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to generate preference list.")
      }

      const data = await res.json()
      setResults(data.items || [])
      setTotalCount(data.totalCount || 0)
      setIsPaid(data.isPaid || false)
      if (data.savedPercentile) {
        setSavedPercentile(data.savedPercentile)
      }
      if (data.lockedPercentileMismatch && data.savedPercentile) {
        setErrorMsg(
          `This purchase for ${capRound} is permanently locked to percentile ${data.savedPercentile.toFixed(2)}%. Please use ${data.savedPercentile.toFixed(2)}% or purchase another Preference List plan to unlock percentile ${targetPercentile.toFixed(2)}%.`
        )
      }
      setHasGenerated(true)
    } catch (err: any) {
      console.error("Generation error:", err)
      setErrorMsg(err.message || "Failed to generate preference list.")
    } finally {
      setGenerating(false)
    }
  }

  // 4. Handle Unlock ₹599 Razorpay Payment
  const handleUnlockPayment = async () => {
    if (!session) {
      window.location.href = `/login?callbackUrl=/preference-list-generator`
      return
    }

    const currentPerc = isPaid && savedPercentile ? savedPercentile : parseFloat(percentile)
    if (isNaN(currentPerc) || currentPerc <= 0) {
      setErrorMsg("Please enter a valid percentile before unlocking.")
      return
    }

    setPurchasing(true)
    setErrorMsg(null)

    try {
      const sdkLoaded = await loadRazorpayScript("https://checkout.razorpay.com/v1/checkout.js")
      if (!sdkLoaded) {
        throw new Error("Razorpay SDK failed to load.")
      }

      // Create Order
      const res = await fetch("/api/preference-generator/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round: capRound,
          percentile: currentPerc,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to initiate payment")
      }

      const orderData = await res.json()

      // Handle Mock Mode / Razorpay Checkout
      if (orderData.mock || (orderData.id && orderData.id.startsWith("order_mock_"))) {
        const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 12)}`
        const verifyRes = await fetch("/api/preference-generator/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: orderData.id,
            razorpay_payment_id: mockPaymentId,
            razorpay_signature: "mock_signature",
            round: capRound,
            percentile: currentPerc,
          }),
        })

        if (!verifyRes.ok) throw new Error("Payment verification failed.")

        setIsPaid(true)
        setSavedPercentile(currentPerc)
        await handleGenerate(currentPerc)
        setPurchasing(false)
        return
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "AdmitWise",
        description: `Unlock ${capRound} Preference Generator`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/preference-generator/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                round: capRound,
                percentile: currentPerc,
              }),
            })

            if (!verifyRes.ok) throw new Error("Payment verification failed")

            setIsPaid(true)
            setSavedPercentile(currentPerc)
            await handleGenerate(currentPerc)
          } catch (err: any) {
            setErrorMsg(err.message || "Payment verification failed")
          } finally {
            setPurchasing(false)
          }
        },
        prefill: {
          name: session.user.name || "",
          email: session.user.email || "",
        },
        theme: { color: "#0f172a" },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      console.error("Payment error:", err)
      setErrorMsg(err.message || "Failed to launch payment.")
      setPurchasing(false)
    }
  }

  // 5. Handle PDF Download
  const handleDownloadPDF = async () => {
    if (!isPaid) return
    setDownloading(true)
    setErrorMsg(null)
    try {
      const targetPercentile = savedPercentile || parseFloat(percentile)
      const res = await fetch("/api/preference-generator/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percentile: targetPercentile,
          round: capRound,
          preferredBranches,
          preferredCities,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to generate PDF")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `AdmitWise_CAP_Preference_List_${capRound.replace(/\s+/g, "_")}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error("PDF download error:", err)
      setErrorMsg(err.message || "Failed to download PDF report.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SiteHeader />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Title Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-bold tracking-wide uppercase shadow-xs">
            <Sparkles className="h-3.5 w-3.5" /> MHT CET PCM Option Form
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            AI Preference List Generator
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Generate your optimal CAP Option Form List based on your percentile, preferred branch priorities, city preferences, and official cutoff algorithms.
          </p>
        </div>

        {/* Input Form Card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 bg-white border border-slate-200 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Configure Student Preferences
            </h2>

            {/* Access / Plan Badge */}
            {isPaid && (
              isIncludedInPlan ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-2xs">
                  <Sparkles className="h-4 w-4 text-blue-600" /> {planName || "Full Access Included with Plan"}
                </span>
              ) : savedPercentile !== null ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Saved Percentile: {savedPercentile.toFixed(2)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Preference List Unlocked
                </span>
              )
            )}
          </div>

          {/* Predictor Saved Percentiles Selection */}
          {predictorProfiles.length > 0 && (
            <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Predictor Saved Percentiles
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Click to select for {capRound}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {predictorProfiles.map((pVal) => {
                  const pStr = pVal.toFixed(2)
                  const isSelected = percentile === pStr || percentile === String(pVal)
                  const isLockedForCurrentRound = savedPercentile !== null && Math.abs(savedPercentile - pVal) < 0.05

                  return (
                    <button
                      key={pVal}
                      type="button"
                      onClick={() => setPercentile(pStr)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs scale-105"
                          : isLockedForCurrentRound
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                          : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span>{pStr}%</span>
                      {isLockedForCurrentRound && (
                        <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-semibold">
                          🔒 {capRound} Locked
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Exam Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Exam</label>
              <select
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-medium text-slate-500 cursor-not-allowed shadow-2xs"
              >
                <option>{exam}</option>
              </select>
            </div>

            {/* 2. Percentile Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">Enter Percentile</label>
                {isPaid && savedPercentile !== null && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Locked for {capRound}
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                disabled={isPaid && savedPercentile !== null}
                placeholder="e.g. 95.63"
                value={percentile}
                onChange={(e) => setPercentile(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 shadow-2xs transition-all focus:outline-none focus:ring-2 ${
                  isPaid && savedPercentile !== null
                    ? "bg-slate-100 border-slate-200 cursor-not-allowed font-bold"
                    : "border-slate-200 bg-white focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              />
            </div>

            {/* 3. CAP Round Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target CAP Round</label>
              <select
                value={capRound}
                onChange={(e) => setCapRound(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 shadow-2xs transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {CAP_ROUNDS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Preferred Branches Priority Component */}
            <PrioritySelector
              label="Preferred Branch Priority"
              subtitle="Add branches in order of preference. Drag or use arrows to rearrange."
              options={availableBranches}
              selected={preferredBranches}
              onChange={setPreferredBranches}
              placeholder="Search Engineering Branches..."
            />

            {/* Preferred Cities Priority Component */}
            <PrioritySelector
              label="Preferred City Priority"
              subtitle="Default is ANY city. Or specify your priority order (e.g. Pune → Mumbai)."
              options={availableCities}
              selected={preferredCities}
              onChange={setPreferredCities}
              placeholder="Search Maharashtra Cities..."
              defaultAnyOption={true}
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* CTA Generate Button */}
          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={generating || loadingOptions}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01] hover:shadow-blue-500/30 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {generating ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating AI Preference List...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" /> Generate Preference List
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {hasGenerated && (
          <div className="space-y-6">
            {/* Header / Download Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card rounded-2xl p-5 bg-white border border-slate-200 shadow-md">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Generated Preference List ({totalCount} Colleges)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ordered by Percentile Stage (Dream → Target → Safe), City Priority, and Branch Priority.
                </p>
              </div>

              {isPaid ? (
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  {downloading ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Preparing PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" /> Download Preference List (PDF)
                    </>
                  )}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                  <Lock className="h-3.5 w-3.5" /> Free Preview Mode (First 5 Rows)
                </span>
              )}
            </div>

            {/* Preference List Cards */}
            <div className="space-y-3 relative">
              {results.map((item) => (
                <motion.div
                  key={item.id + item.priorityIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-xl p-4 bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Preference Rank Badge */}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-extrabold text-white shadow-xs">
                      #{item.priorityIndex}
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {item.collegeCode}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {item.collegeName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">{item.branchName}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.city}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    {/* Stage Tag */}
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border shadow-2xs ${
                        item.stageTag === "Dream" || item.stageTag === "Good"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : item.stageTag === "Target" || item.stageTag === "Moderate"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200"
                      }`}
                    >
                      {item.stageTag} Match
                    </span>

                    {/* Cutoff Percentile Display */}
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-slate-900">
                        {item.closingPercentile.toFixed(2)} %ile
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Rank: {item.closingRank > 0 ? item.closingRank : "N/A"}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Free Preview Lock & Paywall Overlay */}
              {!isPaid && totalCount > 5 && (
                <div className="relative mt-4">
                  {/* Blurred Cards Mockup Background */}
                  <div className="space-y-3 blur-xs opacity-40 pointer-events-none select-none">
                    {[6, 7, 8].map((dummyIdx) => (
                      <div key={dummyIdx} className="glass-card rounded-xl p-4 bg-white border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="h-8 w-8 rounded-xl bg-slate-200" />
                          <div className="space-y-2">
                            <div className="h-3 w-48 bg-slate-200 rounded" />
                            <div className="h-2.5 w-32 bg-slate-100 rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Dark Glass Lock Overlay Card */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 shadow-2xl space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <Lock className="h-6 w-6" />
                    </div>

                    <div className="space-y-1 max-w-md">
                      <h3 className="text-xl font-extrabold text-white">
                        Unlock Complete Preference List
                      </h3>
                      <p className="text-xs text-slate-300">
                        Get all {totalCount} recommended colleges, unlimited branch & city priority edits for {capRound}, and downloadable PDF report.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full">
                      <CheckCircle2 className="h-4 w-4" /> Full Option Form • Only ₹599
                    </div>

                    <button
                      type="button"
                      onClick={handleUnlockPayment}
                      disabled={purchasing}
                      className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-extrabold text-white shadow-xl shadow-blue-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {purchasing ? "Processing Payment..." : "Unlock Now (₹599)"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
    <SiteFooter />
  </div>
  )
}
