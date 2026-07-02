"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { User, Mail, Phone, Building2, Calendar, ChevronDown, Save, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

type ProfileData = {
  id: string
  name: string | null
  email: string | null
  mobile: string | null
  image: string | null
  category: string | null
  gender: string | null
  homeUniversity: string | null
  dateOfBirth: string | null
  currentPlan: string | null
}

const CATEGORIES = ["Open", "OBC", "SC", "ST", "VJ-NT", "NT-B", "NT-C", "NT-D", "SBC", "EWS"]
const GENDERS = ["Male", "Female", "Other"]

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [mobile, setMobile] = useState("")
  const [category, setCategory] = useState("")
  const [gender, setGender] = useState("")
  const [homeUniversity, setHomeUniversity] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: ProfileData) => {
        setProfile(data)
        setName(data.name || "")
        setMobile(data.mobile || "")
        setCategory(data.category || "")
        setGender(data.gender || "")
        setHomeUniversity(data.homeUniversity || "")
        setDateOfBirth(
          data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split("T")[0] : ""
        )
      })
      .catch(() => setError("Failed to load profile. Please refresh."))
      .finally(() => setLoading(false))
  }, [status])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || undefined,
        mobile: mobile || null,
        category: category || null,
        gender: gender || null,
        homeUniversity: homeUniversity || null,
        dateOfBirth: dateOfBirth || null,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error || "Failed to save profile")
    } else {
      setSuccess(true)
      setProfile((prev) => (prev ? { ...prev, ...data.user } : null))
      setTimeout(() => setSuccess(false), 4000)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-blue-605" />
        </div>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-2xl py-8 px-4 relative z-10 animate-fade-in-up">
          {/* Background glow backing */}
          <div className="glow-blob -right-20 top-20 h-[300px] w-[300px] bg-blue-500/5" />

          {/* Back link */}
          <Link
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Profile</h1>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Keep your profile up to date to get the most accurate college predictions.
            </p>
          </div>

          {/* Avatar + Plan Badge */}
          <div className="mb-8 flex items-center gap-4 border border-slate-200 bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700 text-xl font-bold uppercase ring-2 ring-blue-100">
              {profile?.image ? (
                <img
                  src={profile.image}
                  alt="Profile"
                  className="h-full w-full rounded-full object-cover border border-slate-200"
                />
              ) : (
                (name || session?.user?.name || "?")[0]
              )}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-base">{name || "Your Name"}</p>
              <div className="mt-1.5 flex items-center gap-2.5">
                <span className="inline-flex items-center rounded-lg bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                  {profile?.currentPlan || "free"} Plan
                </span>
                <Link href="/plans" className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                  Upgrade
                </Link>
              </div>
            </div>
          </div>

          {/* Form Wrapped inside Aeline Glassmorphism Card */}
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 shadow-md border border-slate-200 bg-white/90 backdrop-blur-sm space-y-5">
            {/* Alerts */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Profile updated successfully!</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor="profile-name">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition duration-300"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={profile?.email || ""}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400">Email cannot be changed.</p>
            </div>

            {/* Mobile */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor="profile-mobile">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="profile-mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition duration-300"
                />
              </div>
            </div>

            {/* Category & Gender — 2-col */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor="profile-category">
                  Category
                </label>
                <div className="relative">
                  <select
                    id="profile-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition duration-300"
                  >
                    <option value="" className="text-slate-800">Select category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="text-slate-800">
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor="profile-gender">
                  Gender
                </label>
                <div className="relative">
                  <select
                    id="profile-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition duration-300"
                  >
                    <option value="" className="text-slate-800">Select gender</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g} className="text-slate-800">
                        {g}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Home University */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor="profile-university">
                Home University
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="profile-university"
                  type="text"
                  value={homeUniversity}
                  onChange={(e) => setHomeUniversity(e.target.value)}
                  placeholder="e.g. University of Mumbai, Pune University"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition duration-300"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor="profile-dob">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="profile-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition duration-300"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-premium flex items-center justify-center gap-2 py-3 shadow-blue-500/10 px-8"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
