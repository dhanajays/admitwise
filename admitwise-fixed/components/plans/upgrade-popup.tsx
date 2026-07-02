"use client"

import { useState } from "react"
import { X, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSubscription } from "@/lib/subscription/store"
import { ADDON_PRICE, PLANS } from "@/lib/subscription/types"
import { checkout } from "@/lib/razorpay-client"

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

interface UpgradePopupProps {
  onClose: () => void
  onAddonPurchased: () => void
}

import { useEffect } from "react"
import { DisabledPaymentModal } from "@/components/plans/disabled-payment-modal"

export function UpgradePopup({ onClose, onAddonPurchased }: UpgradePopupProps) {
  const [loading, setLoading] = useState(false)
  const [paymentsEnabled, setPaymentsEnabled] = useState(true)
  const [showDisabledModal, setShowDisabledModal] = useState(false)
  const sub = getSubscription()
  const planName =
    PLANS.find((p) => p.id === sub.plan)?.name ?? "Your Plan"

  useEffect(() => {
    fetch("/api/settings/payments")
      .then((res) => res.json())
      .then((data) => {
        setPaymentsEnabled(data.paymentsEnabled !== false)
      })
      .catch(() => {})
  }, [])

  function handleBuyAddon() {
    if (!paymentsEnabled) {
      setShowDisabledModal(true)
      return
    }

    setLoading(true)
    checkout({
      purchaseType: "addon",
      onSuccess: () => {
        setLoading(false)
        onAddonPurchased()
      },
      onError: (err) => {
        setLoading(false)
        if (err !== "Payment cancelled by user") {
          alert(err || "Payment failed. Please try again.")
        }
      },
    })
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl animate-fade-in-up">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:text-slate-650 transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 border border-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </span>
            <h2 className="font-heading text-lg font-bold text-slate-900 leading-tight">
              You&apos;ve used all your Percentile Profiles
            </h2>
          </div>

          <p className="mt-3 text-xs text-slate-500 leading-relaxed">
            Your current plan includes a limited number of saved percentile
            profiles.
          </p>

          {/* Plan stats */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Current Plan</span>
              <span className="font-bold text-slate-900">{planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Profiles Used</span>
              <span className="font-bold text-slate-900">
                {sub.profiles.length} / {sub.maxProfiles}
              </span>
            </div>
          </div>

          {/* Saved profiles list */}
          {sub.profiles.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Saved Profiles
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {sub.profiles.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>
                      {p.exam} · {p.percentile}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add-on offer */}
          <div className="mt-5 rounded-xl border border-blue-105 bg-blue-50/50 p-4">
            <p className="text-sm font-bold text-slate-900">
              Need another percentile?
            </p>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Purchase one additional Percentile Profile slot.
            </p>
            <p className="mt-2.5 font-heading text-2xl font-extrabold text-blue-650">
              {formatINR(ADDON_PRICE)}
            </p>
          </div>

          {/* Buttons */}
          <div className="mt-5 flex gap-3">
            <button
              className="flex-1 rounded-full border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className={
                !paymentsEnabled
                  ? "flex-1 rounded-full border border-slate-200 bg-slate-100 text-slate-400 px-4 py-2.5 text-xs font-semibold cursor-not-allowed"
                  : "flex-1 btn-premium text-xs"
              }
              onClick={handleBuyAddon}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processing…
                </div>
              ) : !paymentsEnabled ? (
                "Suspended"
              ) : (
                "Buy Now"
              )}
            </button>
          </div>
        </div>
      </div>

      {showDisabledModal && (
        <DisabledPaymentModal onClose={() => setShowDisabledModal(false)} />
      )}
    </div>
  )
}
