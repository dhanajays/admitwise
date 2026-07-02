"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, MessageSquare, Loader2, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import { syncWithDatabase } from "@/lib/subscription/store"

interface UserProfile {
  name?: string
  email?: string
  mobile?: string
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const planId = searchParams.get("planId") || ""
  const orderId = searchParams.get("orderId") || "—"

  const { update } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sync the database state and trigger NextAuth session updates
    syncWithDatabase()
      .then(() => {
        update()
      })
      .catch((e) => console.error("Fulfillment sync error:", e))

    fetch("/api/profile")
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        setProfile(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [update])

  // Auto-detect purchased plan name
  const getPlanDetails = () => {
    if (planId === "premium") {
      return {
        name: "Premium CAP Support",
        isEligible: true,
      }
    }
    if (planId === "elite") {
      return {
        name: "Elite Admission Support",
        isEligible: true,
      }
    }
    return {
      name: "AdmitWise Plan",
      isEligible: false,
    }
  }

  const plan = getPlanDetails()

  // Generate dynamic pre-filled WhatsApp message
  const generateWhatsAppUrl = () => {
    const userName = profile?.name || "Not provided"
    const userEmail = profile?.email || "Not provided"
    const userPhone = profile?.mobile || "Not provided"

    const message = `Hello AdmitWise Team,
I have successfully purchased the **${plan.name}** plan.
Please assist me with the further admission process.
Name: ${userName}
Email: ${userEmail}
Mobile: ${userPhone}
Order ID: ${orderId}
Thank you.`

    return `https://wa.me/919209568186?text=${encodeURIComponent(message)}`
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-xs text-slate-500 font-medium">Activating your plan...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        {/* Background glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/5 filter blur-[120px]" />

        <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-205 bg-white p-8 text-center shadow-xl">
          {/* Animated Success Icon */}
          <div className="flex justify-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-pulse" />
            </div>
          </div>

          <h1 className="mt-6 font-heading text-2xl font-extrabold tracking-tight text-slate-900">
            Payment Successful!
          </h1>
          <p className="mt-2.5 text-xs text-slate-500 leading-relaxed">
            Your purchased plan has been successfully activated on your profile.
          </p>

          {/* Receipt Details Box */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs space-y-2.5">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Purchased Plan</span>
              <span className="font-bold text-slate-900">{plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Order ID</span>
              <span className="font-mono font-bold text-slate-700">{orderId}</span>
            </div>
            {profile?.name && (
              <div className="flex justify-between border-t border-slate-200/50 pt-2">
                <span className="text-slate-405 font-semibold uppercase tracking-wider text-[9px]">Student Name</span>
                <span className="font-medium text-slate-800">{profile.name}</span>
              </div>
            )}
            {profile?.mobile && (
              <div className="flex justify-between">
                <span className="text-slate-405 font-semibold uppercase tracking-wider text-[9px]">Mobile</span>
                <span className="font-medium text-slate-800">{profile.mobile}</span>
              </div>
            )}
          </div>

          {/* CTA Actions */}
          <div className="mt-8 flex flex-col gap-3">
            {/* WhatsApp Chat Trigger (Conditionally rendered only for Premium/Elite plans) */}
            {plan.isEligible && (
              <a
                href={generateWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
                id="whatsapp-support-btn"
              >
                <Button className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white py-3 font-bold transition duration-300 shadow-md shadow-emerald-500/10">
                  <MessageSquare className="h-4.5 w-4.5" />
                  Chat on WhatsApp
                </Button>
              </a>
            )}

            <Link href="/dashboard" className="w-full">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-3 font-semibold transition duration-300"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-xs text-slate-500 font-medium">Loading success details...</p>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  )
}
