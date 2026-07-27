"use client"

import { useState, useEffect } from "react"
import { X, Sparkles, Loader2, Lock, ShieldCheck } from "lucide-react"
import { checkout } from "@/lib/razorpay-client"
import { DisabledPaymentModal } from "@/components/plans/disabled-payment-modal"

interface TrackerSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function TrackerSubscriptionModal({
  isOpen,
  onClose,
  onSuccess,
}: TrackerSubscriptionModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [paymentsEnabled, setPaymentsEnabled] = useState(true)
  const [showDisabledModal, setShowDisabledModal] = useState(false)

  useEffect(() => {
    fetch("/api/settings/payments")
      .then((res) => res.json())
      .then((data) => {
        setPaymentsEnabled(data.paymentsEnabled !== false)
      })
      .catch(() => {})
  }, [])

  if (!isOpen) return null

  const handleSelectPlan = (planId: "single" | "multi_round") => {
    if (!paymentsEnabled) {
      setShowDisabledModal(true)
      return
    }

    setLoadingPlan(planId)
    checkout({
      purchaseType: "plan",
      planId,
      onSuccess: () => {
        setLoadingPlan(null)
        onSuccess()
      },
      onError: (err) => {
        setLoadingPlan(null)
        if (err !== "Payment cancelled by user") {
          alert(err || "Payment failed. Please try again.")
        }
      },
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl animate-fade-in-up my-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Title & Sub-message */}
        <div className="text-center max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">
            <Lock className="h-3.5 w-3.5 text-blue-600" /> Premium Access
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Unlock Vacant Seat Tracker
          </h2>
          <div className="mt-2 text-xs sm:text-sm text-slate-600 font-medium space-y-1">
            <p className="font-semibold text-slate-800">You don&apos;t have an active plan.</p>
            <p className="text-slate-500">
              Purchase a plan to unlock the complete Vacant Seat Tracker and College Predictor.
            </p>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 sm:mt-8 items-stretch">
          {/* ₹499 Plan */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg font-bold text-slate-900">₹499 Plan</h3>
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-heading text-3xl font-extrabold text-slate-900">₹499</span>
              </div>

              <div className="mt-5 space-y-2.5 text-xs text-slate-600">
                {[
                  "Valid for 1 CAP Round",
                  "Vacant Seat Tracker for 1 Category",
                  "College Predictor for 1 Saved Percentile",
                  "Complete Vacant Seat List",
                  "Complete College Prediction",
                  "Instant Access after Payment",
                ].map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 mt-0.5 text-[10px]">
                      ✓
                    </span>
                    <span className="leading-snug">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSelectPlan("single")}
              disabled={loadingPlan !== null}
              className="mt-6 w-full rounded-xl border-2 border-blue-600 bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs sm:text-sm py-3 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loadingPlan === "single" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  Processing...
                </>
              ) : (
                "Unlock for ₹499"
              )}
            </button>
          </div>

          {/* ₹1800 Plan (Recommended) */}
          <div className="rounded-2xl border-2 border-blue-600 bg-gradient-to-b from-blue-50/50 via-white to-indigo-50/30 p-5 sm:p-6 shadow-xl relative flex flex-col justify-between">
            {/* Recommended Badge */}
            <div className="absolute -top-3.5 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-300" /> Recommended
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg font-bold text-slate-900">₹1800 Plan</h3>
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-heading text-3xl font-extrabold text-blue-700">₹1800</span>
              </div>

              <div className="mt-5 space-y-2.5 text-xs text-slate-700 font-medium">
                {[
                  "Valid for All CAP Rounds",
                  "Vacant Seat Tracker for 2 Categories",
                  "College Predictor for 2 Saved Percentiles",
                  "Complete Vacant Seat List",
                  "Complete College Prediction",
                  "Access for all CAP Rounds",
                ].map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold mt-0.5 text-[10px]">
                      ✓
                    </span>
                    <span className="leading-snug">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSelectPlan("multi_round")}
              disabled={loadingPlan !== null}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm py-3 shadow-md shadow-blue-500/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
            >
              {loadingPlan === "multi_round" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Processing...
                </>
              ) : (
                "Unlock for ₹1800"
              )}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>100% Secure Razorpay Payment · Instant Activation</span>
        </div>
      </div>

      {showDisabledModal && (
        <DisabledPaymentModal onClose={() => setShowDisabledModal(false)} />
      )}
    </div>
  )
}
