"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Loader2, Phone, AlertCircle, ShieldCheck } from "lucide-react"
import { CustomSession } from "@/lib/auth"

export function MandatoryPhoneGate() {
  const { data: session, status, update } = useSession()
  const customSession = session as CustomSession | null
  const [mobile, setMobile] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDbComplete, setIsDbComplete] = useState<boolean | null>(null)

  // Side effect to query actual DB values directly from /api/profile to prevent NextAuth session staleness loops
  useEffect(() => {
    if (status === "loading") return

    if (status !== "authenticated" || customSession?.user?.loginProvider !== "google") {
      setIsDbComplete(true)
      return
    }

    let isMounted = true
    async function checkDbStatus() {
      try {
        console.log("[PhoneGate] Fetching profile directly from DB to verify status...")
        const res = await fetch("/api/profile")
        if (res.ok) {
          const data = await res.json()
          console.log("[PhoneGate] GET /api/profile response:", {
            mobile: data.mobile,
            isFirstGoogleSignup: data.isFirstGoogleSignup,
          })

          if (isMounted) {
            // Dismiss if first sign-up flag is set to false OR if mobile number is already filled in database
            if (data.isFirstGoogleSignup === false || data.mobile) {
              console.log("[PhoneGate] Database profile complete. Setting gate hidden.")
              setIsDbComplete(true)
            } else {
              console.log("[PhoneGate] First-time sign-up flag active and mobile missing. Rendering popup.")
              setIsDbComplete(false)
            }
          }
        } else {
          console.error("[PhoneGate] Failed to fetch profile from API. Status:", res.status)
        }
      } catch (err) {
        console.error("[PhoneGate] Error querying database status:", err)
      }
    }

    checkDbStatus()
    return () => {
      isMounted = false
    }
  }, [status, customSession?.user?.loginProvider])

  // Show only if authenticated, provider is google, and local database complete flag is false
  const showGate =
    status === "authenticated" &&
    customSession?.user?.loginProvider === "google" &&
    isDbComplete === false

  // Handle body scroll lock
  useEffect(() => {
    if (showGate) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [showGate])

  if (!showGate) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cleanMobile = mobile.trim()
    if (!cleanMobile) {
      setError("Mobile number is required")
      return
    }

    if (!/^\d{10}$/.test(cleanMobile)) {
      setError("Please enter a valid 10-digit mobile number")
      return
    }

    setLoading(true)
    try {
      // 1. Log before save
      console.log("[PhoneGate] Before Save Log:", {
        phoneInState: cleanMobile,
        userId: customSession?.user?.id,
        sessionProvider: customSession?.user?.loginProvider,
        sessionIsFirstGoogleSignup: customSession?.user?.isFirstGoogleSignup,
      })

      // 2. Perform API update call
      const res = await fetch("/api/user/update-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: customSession?.user?.id,
          phone: cleanMobile,
        }),
      })

      console.log("[PhoneGate] API Response Status:", res.status)

      if (res.status === 409) {
        setError("This mobile number is already registered to another account")
        setLoading(false)
        return
      }

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to update profile. Please try again.")
        setLoading(false)
        return
      }

      const resData = await res.json()
      console.log("[PhoneGate] API Update Response:", resData)

      // 3. Close the modal immediately by setting local state to true (preventing race condition delay)
      console.log("[PhoneGate] Closing modal immediately by setting local state.")
      setIsDbComplete(true)

      // 4. Force NextAuth session update
      console.log("[PhoneGate] Requesting NextAuth session update...")
      const updatedSession = await update({
        isFirstGoogleSignup: false,
        mobile: cleanMobile,
      })
      console.log("[PhoneGate] NextAuth session update completed. Updated session:", updatedSession)

      // 5. Query updated database user to log the final state as requested
      const verifyRes = await fetch("/api/profile")
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json()
        console.log("[PhoneGate] Database Verification After Update:", {
          mobile: verifyData.mobile,
          isFirstGoogleSignup: verifyData.isFirstGoogleSignup,
        })
      }

      // 6. Reload browser cleanly
      console.log("[PhoneGate] Reloading page to refresh Next.js context and layout completely.")
      window.location.reload()
    } catch (err) {
      console.error("[PhoneGate] Error in handleSubmit:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-2xl space-y-6 animate-scale-in">
        
        {/* Header Icon / Branding */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <Phone className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-xl font-extrabold text-slate-900">
            Complete Your Profile
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
            Welcome to AdmitWise! Please add your mobile number to complete your account setup. 
            This is required for admission updates, purchase verification, OTP verification, and customer support.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455">
              Mobile Number
            </label>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500/25 focus-within:border-blue-500 transition overflow-hidden">
              <span className="flex items-center justify-center bg-slate-100/80 border-r border-slate-200/80 px-3.5 text-sm font-semibold text-slate-500">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="9876543210"
                value={mobile}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "")
                  setMobile(val)
                  setError(null)
                }}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          {/* Validation Alert */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-650 animate-shake">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4.5 w-4.5" /> Save & Continue
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
