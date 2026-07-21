"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { motion } from "framer-motion"
import {
  Menu,
  X,
  LayoutDashboard,
  User,
  History,
  Settings,
  LogOut,
  CreditCard,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { isSubscribed, syncWithDatabase, getSubscription } from "@/lib/subscription/store"
import { useMemo } from "react"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/predictor", label: "Predictor" },
  { href: "/vacant-seat-tracker", label: "Vacant Seat Tracker" },
  { href: "/plans", label: "Plans" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [sub, setSub] = useState<any>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync subscription state from store
  useEffect(() => {
    setSubscribed(isSubscribed())
    setSub(getSubscription())

    syncWithDatabase().then((updated) => {
      setSubscribed(isSubscribed())
      setSub(updated)
    })

    const handleStorage = () => {
      setSubscribed(isSubscribed())
      setSub(getSubscription())
    }
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener("storage", handleStorage)
    }
  }, [session])

  const planName = useMemo(() => {
    if (!sub) return "free"
    const p = sub.plan
    if (p === "free") return "free"
    if (p === "single") return "Single Predictor"
    if (p === "multi_round") return "Multi-Round"
    if (p === "premium") return "Premium"
    if (p === "elite") return "Elite"
    return p
  }, [sub])

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const user = session?.user as any

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/85 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo with Official Image */}
        <Link
          href="/"
          className="flex items-center gap-2 group"
          onClick={() => setOpen(false)}
        >
          <img
            src="/images/logo.png"
            alt="AdmitWise Logo"
            className="h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-300",
                  isActive ? "text-primary" : "text-slate-650 hover:text-slate-950 hover:bg-slate-50"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeNavTab"
                    className="absolute inset-0 bg-violet-50 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {link.label}
              </Link>
            )
          })}
          {status === "authenticated" && (
            <Link
              href="/dashboard"
              className={cn(
                "relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-300",
                pathname === "/dashboard"
                  ? "text-primary"
                  : "text-slate-650 hover:text-slate-955 hover:bg-slate-55"
              )}
            >
              {pathname === "/dashboard" && (
                <motion.span
                  layoutId="activeNavTab"
                  className="absolute inset-0 bg-violet-50 rounded-full -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <LayoutDashboard className="h-3.5 w-3.5" />
              My Plan
            </Link>
          )}
        </nav>

        {/* Desktop Right Side CTA & Auth Dropdown */}
        <div className="hidden items-center gap-4 md:flex">
          {status === "authenticated" && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:outline-none transition duration-300 shadow-sm"
              >
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || "User Avatar"}
                    className="h-7 w-7 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 uppercase">
                    {(user.name || user.email || "?")[0]}
                  </div>
                )}
                <span className="max-w-[120px] truncate">{user.name || "My Account"}</span>
                <ChevronDown className="h-4 w-4 text-slate-400 transition duration-300" />
              </button>

              {/* Dropdown Menu (Frosted Light Glassmorphism Style) */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 origin-top-right rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl p-2 shadow-xl ring-1 ring-black/5 focus:outline-none animate-fade-in-up">
                  {/* User Profile Header */}
                  <div className="px-3 py-3">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {user.name || "AdmitWise Student"}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {user.email}
                    </p>
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-50/50 border border-blue-100 px-2.5 py-2 text-[11px] font-semibold text-blue-700">
                      <span className="capitalize">{planName} Plan</span>
                      <span className="text-slate-500 font-medium">
                        {sub ? sub.profiles.length : 0}/{sub ? sub.maxProfiles : 0} profiles
                      </span>
                    </div>
                  </div>

                  <div className="my-1.5 border-t border-slate-100" />

                  {/* Nav Options */}
                  <div className="space-y-0.5">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition duration-300"
                    >
                      <User className="h-4 w-4 text-slate-400" />
                      My Profile
                    </Link>
                    <Link
                      href="/predictor"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition duration-300"
                    >
                      <History className="h-4 w-4 text-slate-400" />
                      Prediction History
                    </Link>
                    <Link
                      href="/plans"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition duration-300"
                    >
                      <CreditCard className="h-4 w-4 text-slate-400" />
                      My Subscription/Plans
                    </Link>
                  </div>

                  <div className="my-1.5 border-t border-slate-100" />

                  {/* Sign Out */}
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false)
                      signOut({ callbackUrl: "/" })
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition duration-300 font-semibold"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition duration-300"
              >
                Sign In
              </Link>
              <Link href="/register" className="btn-premium py-2 px-5 shadow-blue-500/10">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger menu */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl p-2 text-slate-700 hover:bg-slate-100 transition duration-300 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {open && (
        <div className="border-t border-slate-200 bg-white/95 backdrop-blur-2xl animate-fade-in-up md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-base font-medium transition duration-300",
                  pathname === link.href
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {link.label}
              </Link>
            ))}

            {status === "authenticated" && user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2.5 text-base font-medium transition duration-300",
                    pathname === "/dashboard"
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  My Plan
                </Link>

                <div className="my-3 border-t border-slate-150" />

                {/* Profile Summary & Links */}
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl mb-3">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {user.name || "AdmitWise Student"}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                  <p className="mt-2 text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                    {planName} Plan · {sub ? sub.profiles.length : 0}/{sub ? sub.maxProfiles : 0} profiles
                  </p>
                </div>

                <div className="space-y-0.5">
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                  <Link
                    href="/predictor"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                  >
                    <History className="h-4 w-4" />
                    Prediction History
                  </Link>
                  <Link
                    href="/plans"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                  >
                    <CreditCard className="h-4 w-4" />
                    My Subscription/Plans
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      signOut({ callbackUrl: "/" })
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition font-semibold"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4 flex flex-col gap-2.5">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center rounded-full border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="btn-premium flex w-full items-center justify-center py-2.5 text-sm font-semibold"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
