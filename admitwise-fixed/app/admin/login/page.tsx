"use client"

import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Shield, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  )
}

function AdminLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Login failed. Please check your credentials.")
        return
      }

      router.replace("/admin")
    } catch {
      setError("A network error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 overflow-hidden px-4 py-12">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 filter blur-[150px]" />
      <div className="pointer-events-none absolute right-0 top-0 h-[250px] w-[250px] rounded-full bg-indigo-500/5 filter blur-[100px]" />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            AdmitWise Admin
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            Secure administrative access only
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-sm p-8 shadow-lg shadow-slate-200/50">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@admitwise.in"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition duration-300"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/15 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
              ) : (
                <><Shield className="h-4 w-4" /> Sign In to Admin</>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          This panel is restricted to AdmitWise staff only.
          <br />
          If you are a student,{" "}
          <Link href="/login" className="text-slate-500 underline hover:text-blue-600 transition">
            login here
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
