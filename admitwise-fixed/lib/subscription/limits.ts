export interface ProfileStats {
  used: number
  max: number
  remaining: number
  percent: number
}

export interface UnifiedSubscriptionStats {
  mhtCet: ProfileStats
  jeeMain: ProfileStats
  neet: ProfileStats
  tracker: ProfileStats
}

export const PLAN_BASE_LIMITS: Record<string, number> = {
  free: 0,
  single: 1,
  multi_round: 2,
  premium: 3,
  elite: 4,
}

export function calculateUnifiedStats(
  planId: string | null,
  profileLimit: number,
  trackerProfileLimit: number,
  profiles: any[],
  trackerProfiles: any[]
): UnifiedSubscriptionStats {
  const plan = planId || "free"

  // 1. Determine Maximum Allowed Profiles
  // profileLimit from User table contains base plan limit + purchased addons
  const maxMhtCet = profileLimit
  const maxJeeMain = profileLimit
  const maxNeet = profileLimit
  const maxTracker = trackerProfileLimit

  // 2. Calculate MHT CET Profiles Used
  // MHT-CET profiles have predictionType === 'mht-cet' or are not All India
  const mhtCetUsed = profiles.filter(
    (p) => p.predictionType === "mht-cet" || (p.predictionType !== "all-india" && !p.exam.includes("JEE") && !p.exam.includes("NEET"))
  ).length

  // 3. Calculate JEE(Main) Profiles Used
  // Support both exam === 'JEE(Main)' and backward compatibility with JSON string stored in examScores
  const jeeMainUsed = profiles.filter((p) => {
    if (p.exam === "JEE(Main)") return true
    if (p.predictionType === "all-india" && p.examScores) {
      try {
        const scores = JSON.parse(p.examScores)
        return scores.some((s: any) => s.exam === "JEE(Main)")
      } catch {
        return false
      }
    }
    return false
  }).length

  // 4. Calculate NEET Profiles Used
  // Support both exam === 'NEET' and backward compatibility with JSON string stored in examScores
  const neetUsed = profiles.filter((p) => {
    if (p.exam === "NEET") return true
    if (p.predictionType === "all-india" && p.examScores) {
      try {
        const scores = JSON.parse(p.examScores)
        return scores.some((s: any) => s.exam === "NEET")
      } catch {
        return false
      }
    }
    return false
  }).length

  // 5. Calculate Vacant Seat Tracker Category Profiles Used
  // Category tracking profile limit is based on unique category entries
  const uniqueCategories = Array.from(
    new Set((trackerProfiles || []).map((p) => p.category.toUpperCase()))
  )
  const trackerUsed = uniqueCategories.length

  const buildStats = (used: number, max: number): ProfileStats => ({
    used,
    max,
    remaining: Math.max(0, max - used),
    percent: max > 0 ? Math.min(100, (used / max) * 100) : 0,
  })

  return {
    mhtCet: buildStats(mhtCetUsed, maxMhtCet),
    jeeMain: buildStats(jeeMainUsed, maxJeeMain),
    neet: buildStats(neetUsed, maxNeet),
    tracker: buildStats(trackerUsed, maxTracker),
  }
}
