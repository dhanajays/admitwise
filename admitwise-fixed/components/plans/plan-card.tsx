"use client"

import { useState } from "react"
import { Check, Loader2, Sparkles, TrendingUp } from "lucide-react"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Plan } from "@/lib/subscription/types"
import { checkout } from "@/lib/razorpay-client"

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

import { useEffect } from "react"
import { DisabledPaymentModal } from "@/components/plans/disabled-payment-modal"

let paymentsSettingsPromise: Promise<boolean> | null = null

function getPaymentsEnabled(): Promise<boolean> {
  if (paymentsSettingsPromise) return paymentsSettingsPromise
  paymentsSettingsPromise = fetch("/api/settings/payments")
    .then((res) => {
      if (!res.ok) throw new Error()
      return res.json()
    })
    .then((data) => data.paymentsEnabled)
    .catch(() => true)
  return paymentsSettingsPromise
}

export function PlanCard({ plan }: { plan: Plan }) {
  const [loading, setLoading] = useState(false)
  const [purchased, setPurchased] = useState(false)
  const [paymentsEnabled, setPaymentsEnabled] = useState(true)
  const [showDisabledModal, setShowDisabledModal] = useState(false)
  const { data: session } = useSession()

  useEffect(() => {
    getPaymentsEnabled().then((enabled) => {
      setPaymentsEnabled(enabled)
    })
  }, [])

  const planTier: Record<string, number> = {
    free: 0,
    single: 1,
    multi_round: 2,
    premium: 3,
    elite: 4,
  }
  const currentPlan = (session?.user as any)?.currentPlan || "free"
  const currentTier = planTier[currentPlan] || 0
  const cardTier = planTier[plan.id] || 0

  // The ₹499 Single Predictor plan doubles as an Add-on, so it should never be locked
  const isSinglePlan = plan.id === "single"
  const isCurrentPlan = !isSinglePlan && currentPlan === plan.id
  const isLowerPlan = !isSinglePlan && currentTier > cardTier

  function handlePurchase() {
    if (isCurrentPlan || isLowerPlan) return

    if (!paymentsEnabled) {
      setShowDisabledModal(true)
      return
    }

    if (!session || !session.user) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
      return
    }

    // Determine purchase type dynamically as specified by business logic
    const hasBasePlan = currentPlan !== "free"
    const resolvedPurchaseType = (isSinglePlan && hasBasePlan) ? "addon" : "plan"
    const resolvedPlanId = (isSinglePlan && hasBasePlan) ? undefined : plan.id

    setLoading(true)
    checkout({
      purchaseType: resolvedPurchaseType,
      planId: resolvedPlanId,
      onSuccess: (details) => {
        setLoading(false)
        setPurchased(true)
        setTimeout(() => {
          if (plan.id === "premium" || plan.id === "elite") {
            const orderId = details?.orderId || ""
            window.location.href = `/payment-success?planId=${plan.id}&orderId=${orderId}`
          } else {
            window.location.href = "/dashboard"
          }
        }, 1500)
      },
      onError: (err) => {
        setLoading(false)
        if (err !== "Payment cancelled by user") {
          alert(err || "Payment failed. Please try again.")
        }
      },
    })
  }

  const isMultiRound = plan.id === "multi_round"
  return (
    <div
      className={cn(
        "h-full relative flex flex-col rounded-2xl p-7 shadow-md transition-all duration-500 bg-white",
        plan.highlight
          ? "border-2 border-primary shadow-xl shadow-indigo-500/5 scale-[1.02] z-10 animate-pulse-subtle"
          : "glass-card glass-card-hover border-slate-200"
      )}
    >
      {/* Dynamic radial glow behind the highlighted card */}
      {plan.highlight && (
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 filter blur-3xl" />
      )}

      {/* Floating Badge */}
      {plan.badge && (
        <span
          className={cn(
            "absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm",
            plan.highlight
              ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border border-violet-400/20"
              : "bg-slate-100 text-slate-650 border border-slate-200"
          )}
        >
          {plan.badge}
        </span>
      )}

      {/* Header */}
      <div className="mb-4">
        <h3 className="font-heading text-lg font-bold text-slate-905 flex items-center gap-2">
          {plan.name}
          {plan.highlight && <Sparkles className="h-4 w-4 text-primary" />}
        </h3>
        <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="mb-6 flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-4xl font-extrabold text-slate-905">
            {formatINR(plan.price)}
          </span>
          <span className="text-xs text-slate-400 font-medium">one-time</span>
        </div>
        
        {/* Discount Savings display */}
        {isMultiRound && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md w-fit mt-1">
            <TrendingUp className="h-3 w-3" /> Save ₹196 on multi-round access
          </span>
        )}
      </div>

      {/* Features */}
      <ul className="mb-8 flex-1 space-y-3 border-t border-slate-100 pt-5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-xs leading-relaxed">
            <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-violet-50 border border-violet-100 text-primary shadow-sm">
              <Check className="h-3 w-3" />
            </span>
            <span className="text-slate-600">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      {purchased ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 py-2.5 text-xs font-semibold text-emerald-600 animate-bounce">
          <Check className="h-4 w-4" />
          Plan Activated!
        </div>
      ) : isCurrentPlan ? (
        <Button
          className="w-full rounded-full py-2.5 text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed hover:bg-slate-100 shadow-none"
          disabled={true}
        >
          Current Plan
        </Button>
      ) : isLowerPlan ? (
        <Button
          className="w-full rounded-full py-2.5 text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed hover:bg-slate-100 shadow-none"
          disabled={true}
        >
          Included in {currentPlan === "elite" ? "Elite" : currentPlan === "premium" ? "Premium" : "Multi-Round"}
        </Button>
      ) : (
        <Button
          className={cn(
            "w-full rounded-full py-2.5 text-xs font-bold transition-all duration-300 shadow-sm",
            !paymentsEnabled
              ? "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-100"
              : plan.highlight
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-95 shadow-md shadow-blue-500/10 hover:scale-[1.01]"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          )}
          onClick={handlePurchase}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : !paymentsEnabled ? (
            "Temporarily Unavailable"
          ) : (
            plan.ctaLabel
          )}
        </Button>
      )}

      {showDisabledModal && (
        <DisabledPaymentModal onClose={() => setShowDisabledModal(false)} />
      )}
    </div>
  )
}
