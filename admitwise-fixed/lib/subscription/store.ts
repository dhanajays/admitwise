"use client"

// ──────────────────────────────────────────────────────────────────────────────
// Client-side subscription store backed by localStorage and synced to DB.
// ──────────────────────────────────────────────────────────────────────────────

import type {
  PercentileProfile,
  TrackerCategoryProfile,
  PlanId,
  UserSubscription,
} from "./types"
import { DEFAULT_SUBSCRIPTION, PLANS } from "./types"
import { calculateUnifiedStats } from "./limits"

const STORAGE_KEY = "admitwise_subscription"

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeRead(): UserSubscription {
  if (typeof window === "undefined") return { ...DEFAULT_SUBSCRIPTION }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SUBSCRIPTION }
    const parsed = JSON.parse(raw) as UserSubscription
    if (parsed.trackerMaxProfiles === undefined) {
      parsed.trackerMaxProfiles = parsed.maxProfiles || 0
    }
    if (parsed.trackerProfiles === undefined) {
      parsed.trackerProfiles = []
    }
    if (parsed.trackerPurchasedAddOns === undefined) {
      parsed.trackerPurchasedAddOns = 0
    }
    if (parsed.singlePurchases === undefined) {
      parsed.singlePurchases = []
    }
    return parsed
  } catch {
    return { ...DEFAULT_SUBSCRIPTION }
  }
}

function safeWrite(data: UserSubscription): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // storage full or unavailable — fail silently
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Get the current subscription state */
export function getSubscription(): UserSubscription {
  return safeRead()
}

/** Sync client-side cache with the backend database state */
export async function syncWithDatabase(): Promise<UserSubscription> {
  if (typeof window === "undefined") return { ...DEFAULT_SUBSCRIPTION }
  try {
    const res = await fetch("/api/subscription")
    if (res.ok) {
      const data = await res.json()
      // Normalize: guarantee these arrays are never undefined
      // regardless of API version, cached response, or DB error
      const normalized: UserSubscription = {
        ...DEFAULT_SUBSCRIPTION,
        ...data,
        profiles: Array.isArray(data.profiles) ? data.profiles : [],
        trackerProfiles: Array.isArray(data.trackerProfiles) ? data.trackerProfiles : [],
        trackerMaxProfiles: data.trackerMaxProfiles ?? data.maxProfiles ?? 0,
        trackerPurchasedAddOns: data.trackerPurchasedAddOns ?? 0,
        purchasedAddOns: data.purchasedAddOns ?? 0,
        singlePurchases: Array.isArray(data.singlePurchases) ? data.singlePurchases : [],
      }
      safeWrite(normalized)
      // Dispatch storage event to notify other tabs/components
      window.dispatchEvent(new Event("storage"))
      return normalized
    }
  } catch (err) {
    console.error("Failed to sync subscription with database:", err)
  }
  return safeRead()
}

/**
 * Activate a plan.
 * Resets profiles only if switching to a lower-tier plan.
 */
export function activatePlan(planId: PlanId): UserSubscription {
  const plan = PLANS.find((p) => p.id === planId)
  if (!plan) throw new Error(`Unknown plan: ${planId}`)

  const current = safeRead()

  const keepProfiles =
    plan.maxProfiles >= current.profiles.length ? current.profiles : []

  const keepTrackerProfiles =
    plan.maxProfiles >= (current.trackerProfiles?.length || 0)
      ? (current.trackerProfiles || [])
      : []

  const next: UserSubscription = {
    plan: planId,
    maxProfiles: plan.maxProfiles,
    profiles: keepProfiles,
    trackerMaxProfiles: plan.maxProfiles,
    trackerProfiles: keepTrackerProfiles,
    purchasedAddOns: current.purchasedAddOns,
    trackerPurchasedAddOns: current.trackerPurchasedAddOns || 0,
    activatedAt: new Date().toISOString(),
  }

  safeWrite(next)
  return next
}

/**
 * Purchase a +1 profile add-on.
 */
export function purchaseProfileAddon(): UserSubscription {
  const current = safeRead()
  const next: UserSubscription = {
    ...current,
    maxProfiles: current.maxProfiles + 1,
    purchasedAddOns: current.purchasedAddOns + 1,
  }
  safeWrite(next)
  return next
}

/**
 * Look up a profile by exam + percentile + other fields.
 */
export function findProfile(
  exam: string,
  percentile: number,
  predictionType?: string,
  examScores?: string | null,
  round?: string,
  gender?: string,
  category?: string,
  homeUniversity?: string,
  disability?: boolean,
  defenseQuota?: boolean,
  preferredBranches?: string[]
): PercentileProfile | null {
  const { profiles } = safeRead()
  const pB = preferredBranches ? JSON.stringify(preferredBranches) : null
  return (
    profiles.find((p) => {
      const storedPB = p.preferredBranches ? JSON.stringify(p.preferredBranches) : null
      if (predictionType === "all-india") {
        return p.predictionType === "all-india" &&
               p.examScores === examScores &&
               (p.round || "I") === (round || "I") &&
               (p.gender || "Male") === (gender || "Male") &&
               (p.category || "OPEN") === (category || "OPEN") &&
               (p.homeUniversity || "") === (homeUniversity || "") &&
               (p.disability || false) === (disability || false) &&
               (p.defenseQuota || false) === (defenseQuota || false) &&
               storedPB === pB
      }
      return p.predictionType !== "all-india" &&
             p.exam === exam &&
             Math.abs(p.percentile - percentile) < 0.00001 &&
             (p.round || "I") === (round || "I") &&
             (p.gender || "Male") === (gender || "Male") &&
             (p.category || "OPEN") === (category || "OPEN") &&
             (p.homeUniversity || "") === (homeUniversity || "") &&
             (p.disability || false) === (disability || false) &&
             (p.defenseQuota || false) === (defenseQuota || false) &&
             storedPB === pB
    }) ?? null
  )
}

/**
 * Add a new profile. Sends API request to sync immediately.
 */
export async function addProfile(
  exam: string,
  percentile: number,
  predictionType?: string,
  examScores?: string | null,
  round?: string,
  gender?: string,
  category?: string,
  homeUniversity?: string,
  disability?: boolean,
  defenseQuota?: boolean,
  preferredBranches?: string[]
): Promise<{ profile: PercentileProfile; subscription: UserSubscription }> {
  const current = safeRead()

  // 1. Unified limit check
  const stats = calculateUnifiedStats(
    current.plan,
    current.maxProfiles,
    current.trackerMaxProfiles,
    current.profiles,
    []
  )

  if (exam === "JEE(Main)") {
    if (stats.jeeMain.remaining <= 0) {
      throw new Error("JEE(Main) profile limit reached")
    }
  } else if (exam === "NEET") {
    if (stats.neet.remaining <= 0) {
      throw new Error("NEET profile limit reached")
    }
  } else {
    if (stats.mhtCet.remaining <= 0) {
      throw new Error("MHT CET profile limit reached")
    }
  }

  // 2. Call DB
  try {
    const res = await fetch("/api/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exam,
        percentile,
        predictionType,
        examScores,
        round,
        gender,
        category,
        homeUniversity,
        disability,
        defenseQuota,
        preferredBranches,
      }),
    })

    if (!res.ok) {
      const errData = await res.json()
      throw new Error(errData.error || "Failed to save profile in database")
    }

    const { profile } = await res.json()

    // 3. Update local cache
    const next: UserSubscription = {
      ...current,
      profiles: [...current.profiles, profile],
    }
    safeWrite(next)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"))
    }
    return { profile, subscription: next }
  } catch (error) {
    console.error("Error adding profile to DB, falling back to local simulation:", error)
    // Client-side fallback if backend fails or offline
    const profile: PercentileProfile = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      exam,
      percentile,
      predictionType,
      examScores,
      createdAt: new Date().toISOString(),
    }
    const next: UserSubscription = {
      ...current,
      profiles: [...current.profiles, profile],
    }
    safeWrite(next)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"))
    }
    return { profile, subscription: next }
  }
}

/** Number of remaining profile slots */
export function remainingProfiles(): number {
  const { maxProfiles, profiles } = safeRead()
  return Math.max(0, maxProfiles - profiles.length)
}

/** Look up a tracker profile by exam + round + category. */
export function findTrackerProfile(
  exam: string,
  round: string,
  category: string
): TrackerCategoryProfile | null {
  const { plan, trackerProfiles } = safeRead()
  const list = trackerProfiles || []
  return (
    list.find((p) => {
      if (plan === "single") {
        return p.exam === exam && p.round === round && p.category.toUpperCase() === category.toUpperCase()
      } else {
        return p.exam === exam && p.category.toUpperCase() === category.toUpperCase()
      }
    }) ?? null
  )
}

/** Add a new tracker category profile. Sends API request to sync immediately. */
export async function addTrackerProfile(
  exam: string,
  round: string,
  category: string
): Promise<{ profile: TrackerCategoryProfile; subscription: UserSubscription }> {
  const current = safeRead()
  const list = current.trackerProfiles || []
  const limit = current.trackerMaxProfiles || 0

  const existing = findTrackerProfile(exam, round, category)
  if (existing) {
    return { profile: existing, subscription: current }
  }

  if (current.plan === "single") {
    if (list.length >= limit) {
      throw new Error("Tracker Category Profile limit reached")
    }
  } else {
    const uniqueCats = Array.from(new Set(list.map((p) => p.category.toUpperCase())))
    if (!uniqueCats.includes(category.toUpperCase())) {
      if (uniqueCats.length >= limit) {
        throw new Error("Tracker Category Profile limit reached")
      }
    }
  }

  try {
    const res = await fetch("/api/subscription/tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exam, round, category }),
    })

    if (!res.ok) {
      const errData = await res.json()
      throw new Error(errData.error || "Failed to save tracker profile in database")
    }

    const { profile } = await res.json()

    const alreadyStored = list.some((p) => p.id === profile.id)
    const updatedList = alreadyStored ? list : [...list, profile]

    const next: UserSubscription = {
      ...current,
      trackerProfiles: updatedList,
    }
    safeWrite(next)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"))
    }
    return { profile, subscription: next }
  } catch (error) {
    console.error("Error adding tracker profile to DB, falling back to local simulation:", error)
    const profile: TrackerCategoryProfile = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      exam,
      round,
      category,
      createdAt: new Date().toISOString(),
    }
    const next: UserSubscription = {
      ...current,
      trackerProfiles: [...list, profile],
    }
    safeWrite(next)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"))
    }
    return { profile, subscription: next }
  }
}

/** Number of remaining tracker profile slots */
export function remainingTrackerProfiles(): number {
  const { plan, trackerMaxProfiles, trackerProfiles } = safeRead()
  const list = trackerProfiles || []
  if (plan === "single") {
    return Math.max(0, trackerMaxProfiles - list.length)
  } else {
    const uniqueCats = Array.from(new Set(list.map((p) => p.category.toUpperCase())))
    return Math.max(0, trackerMaxProfiles - uniqueCats.length)
  }
}

/** True if the subscription is active (plan was purchased) */
export function isSubscribed(): boolean {
  const sub = safeRead()
  return (!!sub.plan && sub.plan !== "free") || (sub.maxProfiles > 0 && !!sub.activatedAt)
}

/** Hard-reset (for testing / dev) */
export function resetSubscription(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY)
  }
}
