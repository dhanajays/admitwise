"use client"

import { useEffect, useState, useCallback } from "react"
import { Loader2, Plus, Lock, Check, CreditCard, UserCircle, ClipboardList } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"

import {
  getSubscription,
  isSubscribed,
  syncWithDatabase,
} from "@/lib/subscription/store"
import { PLANS, ADDON_PRICE } from "@/lib/subscription/types"
import { calculateUnifiedStats } from "@/lib/subscription/limits"
import type { UserSubscription } from "@/lib/subscription/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { checkout } from "@/lib/razorpay-client"

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

import { DisabledPaymentModal } from "@/components/plans/disabled-payment-modal"

export function DashboardClient() {
  const { update } = useSession()
  const [sub, setSub] = useState<UserSubscription | null>(null)
  const [addonLoading, setAddonLoading] = useState(false)
  const [addonSuccess, setAddonSuccess] = useState(false)
  const [paymentsEnabled, setPaymentsEnabled] = useState(true)
  const [showDisabledModal, setShowDisabledModal] = useState(false)
  const [prefPurchase, setPrefPurchase] = useState<any>(null)

  // Read from localStorage on mount and register storage listener for instant updates
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

    fetch("/api/preference-generator/purchase")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasAccess) setPrefPurchase(data)
      })
      .catch(() => {})
    
    fetch("/api/settings/payments")
      .then((res) => res.json())
      .then((data) => {
        setPaymentsEnabled(data.paymentsEnabled !== false)
      })
      .catch(() => {})

    return () => {
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  const handleBuyAddon = useCallback(() => {
    if (!paymentsEnabled) {
      setShowDisabledModal(true)
      return
    }

    setAddonLoading(true)
    setAddonSuccess(false)
    checkout({
      purchaseType: "addon",
      onSuccess: () => {
        setAddonLoading(false)
        setAddonSuccess(true)
        setTimeout(() => setAddonSuccess(false), 3000)
        syncWithDatabase().then((updated) => {
          setSub(updated)
          update()
        })
      },
      onError: (err) => {
        setAddonLoading(false)
        if (err !== "Payment cancelled by user") {
          alert(err || "Payment failed. Please try again.")
        }
      },
    })
  }, [paymentsEnabled, update])

  if (sub === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const subscribed = isSubscribed()
  const planDetails = PLANS.find((p) => p.id === sub.plan)

  const stats = calculateUnifiedStats(
    sub.plan,
    sub.maxProfiles,
    sub.trackerMaxProfiles,
    sub.profiles,
    sub.trackerProfiles
  )

  const planLimits: Record<string, number> = {
    free: 0,
    single: 1,
    multi_round: 2,
    premium: 3,
    elite: 4,
  }
  const basePlanLimit = planLimits[sub.plan] || 0
  const purchasedAddons = sub.purchasedAddOns || 0

  if (!subscribed) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-sm p-10 text-center relative overflow-hidden shadow-md">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 filter blur-2xl" />
        <CreditCard className="mx-auto h-10 w-10 text-slate-400 relative z-10" />
        <h2 className="mt-5 font-heading text-xl font-bold text-slate-900 relative z-10">
          No active plan
        </h2>
        <p className="mt-2 text-xs text-slate-500 relative z-10">
          Purchase a plan to start predicting colleges.
        </p>
        <Link href="/plans" className="relative z-10 inline-block mt-6">
          <Button className="btn-premium rounded-full px-8">View Plans</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] animate-fade-in-up relative z-10">
      {/* Left column */}
      <div className="space-y-6">
        
        {/* CURRENT SUBSCRIPTION */}
        <div className="glass-card rounded-2xl p-6 shadow-md border border-slate-200 bg-white/90 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-4">
            Current Subscription
          </p>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="font-heading text-2xl font-bold text-slate-900">
                {(sub.plan as string) === "free" ? "Free Plan" : (planDetails?.name ?? sub.plan)}
              </h2>
              {planDetails?.price !== undefined && (
                <p className="mt-1 text-lg font-bold text-slate-700">₹{planDetails.price}</p>
              )}
            </div>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
              Active
            </span>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-500 mb-1 font-medium">Activated On</p>
              <p className="font-bold text-slate-800">{formatDate(sub.activatedAt)}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1 font-medium">Base Profile Limits</p>
              <p className="font-bold text-slate-800">{basePlanLimit} profiles per category</p>
            </div>
          </div>
          
          {planDetails?.features && planDetails.features.length > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-700 mb-3">Included Features</p>
              <ul className="space-y-2.5">
                {planDetails.features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                    <Check className="h-4 w-4 text-blue-500 shrink-0 mt-0" />
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* PREFERENCE LIST GENERATOR PLAN CARD */}
        {(prefPurchase || sub.plan === "premium" || sub.plan === "elite") && (
          <div className="glass-card rounded-2xl p-6 shadow-md border border-indigo-200 bg-indigo-50/40 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1">
                  Preference List Generator
                </p>
                <h3 className="font-heading text-xl font-bold text-slate-900">
                  {sub.plan === "premium"
                    ? "Included in Premium Plan"
                    : sub.plan === "elite"
                    ? "Included in Elite Plan"
                    : "Preference List Unlocked"}
                </h3>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
                Active
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-slate-500 mb-0.5 font-medium">CAP Rounds</p>
                <p className="font-bold text-slate-800">Round 1, 2, 3, 4</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5 font-medium">Saved Percentile Slots</p>
                <p className="font-bold text-indigo-700">{prefPurchase?.usedSlots ?? 0} / {prefPurchase?.totalMaxSlots ?? 0} Used</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5 font-medium">Validity</p>
                <p className="font-bold text-slate-800">Unlimited</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5 font-medium">Regeneration</p>
                <p className="font-bold text-slate-800">Unlimited</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Purchased Add-ons: <strong className="text-slate-700">+{prefPurchase?.purchasedSlots ?? 0} Extra Slots</strong></span>
              <Link href="/preference-list-generator" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                Generate Preference List →
              </Link>
            </div>
          </div>
        )}

        {/* PURCHASED ADD-ONS */}
        {purchasedAddons > 0 && (
          <div className="glass-card rounded-2xl p-6 shadow-md border border-blue-200 bg-blue-50/40 backdrop-blur-sm relative overflow-hidden">
            {/* Background glow */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
            
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-4">
              Purchased Add-ons
            </p>
            
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">Extra Profile Add-ons</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Purchased: <span className="font-bold text-slate-700">{purchasedAddons}</span></p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-blue-200 text-blue-700 font-bold text-lg shadow-sm">
                +{purchasedAddons}
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm relative z-10">
              <p className="text-xs font-bold text-slate-700 mb-3">Each Add-on Includes:</p>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[11px] text-slate-600 font-semibold">
                <div className="flex items-center gap-1.5"><span className="text-blue-600 font-bold bg-blue-50 px-1 rounded border border-blue-100">+1</span> CET Profile</div>
                <div className="flex items-center gap-1.5"><span className="text-blue-600 font-bold bg-blue-50 px-1 rounded border border-blue-100">+1</span> JEE Profile</div>
                <div className="flex items-center gap-1.5"><span className="text-blue-600 font-bold bg-blue-50 px-1 rounded border border-blue-100">+1</span> NEET Profile</div>
                <div className="flex items-center gap-1.5"><span className="text-blue-600 font-bold bg-blue-50 px-1 rounded border border-blue-100">+1</span> CET (All India)</div>
                <div className="flex items-center gap-1.5 col-span-2"><span className="text-blue-600 font-bold bg-blue-50 px-1 rounded border border-blue-100">+1</span> Vacant Seat Category</div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Total Extra Profiles Added:</span>
                <span className="font-extrabold text-blue-700 text-sm">+{purchasedAddons} per category</span>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE SUMMARY */}
        <div className="glass-card rounded-2xl p-6 shadow-md border border-slate-200 bg-white/90 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-5">
            Profile Summary
          </p>
          
          <div className="space-y-4">
            <ProfileStatRow title="MHT CET" stats={stats.mhtCet} baseLimit={basePlanLimit} addons={purchasedAddons} />
            <ProfileStatRow title="JEE (Main)" stats={stats.jeeMain} baseLimit={basePlanLimit} addons={purchasedAddons} />
            <ProfileStatRow title="NEET" stats={stats.neet} baseLimit={basePlanLimit} addons={purchasedAddons} />
            <ProfileStatRow title="MHT CET (All India)" stats={stats.mhtCet} baseLimit={basePlanLimit} addons={purchasedAddons} />
            <ProfileStatRow title="Vacant Seat Tracker" stats={stats.tracker} baseLimit={basePlanLimit} addons={purchasedAddons} />
          </div>
        </div>

        {/* Saved predictor profiles */}
        <div className="glass-card rounded-2xl p-6 shadow-md border border-slate-200 bg-white/90 backdrop-blur-sm">
          <h3 className="font-heading text-base font-bold text-slate-900">
            Saved Percentile Profiles
          </h3>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            Each profile is one unique Exam + Percentile combination.
          </p>

          {sub.profiles.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400 bg-slate-50">
              No profiles saved yet. Go to the{" "}
              <Link href="/predictor" className="text-blue-600 font-semibold hover:underline">
                Predictor
              </Link>{" "}
              and run your first prediction.
            </div>
          ) : (
            <>
              <ul className="mt-5 space-y-2.5">
                {sub.profiles.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      {p.predictionType === "all-india" && p.examScores ? (
                        <>
                          <p className="text-sm font-bold text-slate-900">
                            All India Seat Predictor
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {JSON.parse(p.examScores).map((es: any) => `${es.exam}: ${es.percentile}`).join(", ")}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-bold text-slate-900">
                          {p.exam} · {p.percentile}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Added {formatDate(p.createdAt)}
                      </p>
                    </div>
                    <span
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500"
                      title="Permanent Profile — cannot be deleted"
                    >
                      <Lock className="h-3 w-3" />
                      Permanent
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
                Percentile profiles are permanently linked to your subscription and cannot be deleted or modified.
              </p>
            </>
          )}
        </div>

        {/* Saved vacant seat tracker category profiles */}
        <div className="glass-card rounded-2xl p-6 shadow-md border border-slate-200 bg-white/90 backdrop-blur-sm">
          <h3 className="font-heading text-base font-bold text-slate-900">
            Saved Tracker Category Profiles
          </h3>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            Each profile represents one unique CAP Round and Category combination.
          </p>

          {(!sub.trackerProfiles || sub.trackerProfiles.length === 0) ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400 bg-slate-50">
              No category profiles saved yet. Go to the{" "}
              <Link href="/vacant-seat-tracker" className="text-blue-600 font-semibold hover:underline">
                Vacant Seat Tracker
              </Link>{" "}
              and search vacancies.
            </div>
          ) : (
            <>
              <ul className="mt-5 space-y-2.5">
                {sub.trackerProfiles.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {p.exam} · {p.round} · {p.category}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Added {formatDate(p.createdAt)}
                      </p>
                    </div>
                    <span
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500"
                      title="Permanent Profile — cannot be deleted"
                    >
                      <Lock className="h-3 w-3" />
                      Permanent
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
                Tracker Category profiles are permanently linked to your subscription.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Right column — add-on */}
      <div className="space-y-4">
        <div className="glass-card rounded-2xl p-6 shadow-md border border-slate-200 bg-white/90 backdrop-blur-sm">
          <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
            Add-on Profile (+1)
          </h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed space-y-1">
            <span className="block font-semibold text-slate-700">Unlock an additional saved percentile profile.</span>
            <span className="block">• Works with all existing base plans</span>
            <span className="block">• Can be purchased unlimited times</span>
            <span className="block">• Never replaces your base subscription</span>
            <span className="block mt-1.5 font-medium text-slate-600">Unlocks +1 limit for MHT CET, All India Predictor, and Vacant Seat Tracker.</span>
          </p>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Per additional profile</p>
            <p className="mt-1 font-heading text-3xl font-extrabold text-slate-900">
              {formatINR(ADDON_PRICE)}
            </p>
          </div>

          {addonSuccess ? (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 py-2.5 text-xs font-semibold text-emerald-700">
              <Check className="h-4 w-4" />
              Profile slot added!
            </div>
          ) : (
            <Button
              className={cn(
                "mt-4 w-full rounded-full text-xs font-semibold py-2.5 shadow-sm",
                !paymentsEnabled
                  ? "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-100 cursor-not-allowed"
                  : "btn-premium shadow-blue-500/10"
              )}
              onClick={handleBuyAddon}
              disabled={addonLoading}
            >
              {addonLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : !paymentsEnabled ? (
                "Temporarily Unavailable"
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Buy +1 Profile
                </>
              )}
            </Button>
          )}
        </div>

        {/* Plan features */}
        {planDetails && (
          <div className="glass-card rounded-2xl p-6 shadow-md border border-slate-200 bg-white/90 backdrop-blur-sm">
            <h3 className="font-heading text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
              Included in your plan
            </h3>
            <ul className="space-y-3">
              {planDetails.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-xs leading-relaxed">
                  <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-blue-600">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-slate-600">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* My Profile quick link */}
        <div className="glass-card rounded-2xl p-6 shadow-md border border-slate-200 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
              <UserCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">My Profile</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Update personal details</p>
            </div>
          </div>
          <Link href="/dashboard/profile">
            <button className="mt-4 w-full rounded-full border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition duration-300">
              Edit Profile →
            </button>
          </Link>
        </div>

        {/* Preference List Generator Quick Link */}
        <div className="glass-card rounded-2xl p-6 shadow-md border border-slate-200 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Preference List Generator</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">MHT CET Option Form Generator</p>
            </div>
          </div>
          <Link href="/preference-list-generator">
            <button className="mt-4 w-full rounded-full border border-indigo-200 bg-indigo-50 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition duration-300 shadow-2xs">
              Generate & View Preference List →
            </button>
          </Link>
        </div>
      </div>

      {showDisabledModal && (
        <DisabledPaymentModal onClose={() => setShowDisabledModal(false)} />
      )}
    </div>
  )
}


function ProfileStatRow({ title, stats, baseLimit, addons, colorClass }: any) {
  return (
    <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
        <div className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 shadow-sm">
          Used: <span className="text-slate-900">{stats.used}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-white rounded-lg p-2 border border-slate-200 flex flex-col justify-center">
          <p className="text-slate-400 text-[9px] font-bold uppercase mb-1">Base</p>
          <p className="font-bold text-slate-700">{baseLimit}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border border-slate-200 flex flex-col justify-center">
          <p className="text-slate-400 text-[9px] font-bold uppercase mb-1">Add-ons</p>
          <p className="font-bold text-blue-600">+{addons}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border border-slate-200 flex flex-col justify-center">
          <p className="text-slate-400 text-[9px] font-bold uppercase mb-1">Allowed</p>
          <p className="font-bold text-slate-900">{stats.max}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-200 flex flex-col justify-center shadow-sm">
          <p className="text-blue-600 text-[9px] font-bold uppercase mb-1">Remaining</p>
          <p className="font-bold text-blue-700 text-sm">{stats.remaining}</p>
        </div>
      </div>
    </div>
  )
}
