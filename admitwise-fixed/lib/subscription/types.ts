// ──────────────────────────────────────────────────────────────────────────────
// Subscription types shared across the app
// ──────────────────────────────────────────────────────────────────────────────

export type PlanId = "single" | "multi_round" | "premium" | "elite"

export interface Plan {
  id: PlanId
  name: string
  price: number
  description: string
  maxProfiles: number
  features: string[]
  badge?: string
  highlight: boolean
  ctaLabel: string
}

export const PLANS: Plan[] = [
  {
    id: "single",
    name: "Single Predictor",
    price: 499,
    description:
      "Essential toolkit for accurate predictions. Valid for one selected CAP Round.",
    maxProfiles: 1,
    features: [
      "1 Saved Percentile Profile",
      "MHT CET College Predictor",
      "All India Seat Predictor (JEE(Main), NEET, MHT-CET AI if applicable)",
      "Vacant Seat Tracker",
      "Unlimited predictions using the saved percentile",
      "Unlimited branch filtering",
      "Unlimited category comparison",
      "Unlimited home university comparison",
      "AI Admission Chance Analysis",
      "Closing Percentile & Rank Analysis",
      "Save & Download Prediction Report",
      "Valid for one selected CAP Round",
      "Create and reuse one saved percentile profile",
    ],
    highlight: false,
    ctaLabel: "Unlock Predictor",
  },
  {
    id: "multi_round",
    name: "Multi-Round Predictor",
    price: 1800,
    description:
      "Advanced comparison and strategy planning across all 4 CAP Rounds.",
    maxProfiles: 2,
    badge: "BEST VALUE",
    features: [
      "2 Saved Percentile Profiles",
      "MHT CET College Predictor",
      "All India Seat Predictor (JEE(Main), NEET, MHT-CET AI if applicable)",
      "Vacant Seat Tracker",
      "Unlimited predictions using saved percentiles",
      "Unlimited branch filtering",
      "Unlimited category comparison",
      "Unlimited home university comparison",
      "AI Admission Chance Analysis",
      "Closing Percentile & Rank Analysis",
      "Save & Download Prediction Reports",
      "Access to all CAP Rounds (Round I, II, III & IV)",
      "Compare predictions across all rounds",
      "Save multiple prediction scenarios",
      "Reuse saved percentile profiles without re-entering data",
      "Better preference planning using multiple rounds",
      "Everything included in the ₹499 Single Predictor plan",
    ],
    highlight: false,
    ctaLabel: "Unlock Multi-Round",
  },
  {
    id: "premium",
    name: "Premium CAP Support",
    price: 5000,
    description:
      "Expert 1:1 counselling and complete guidance for CAP Rounds.",
    maxProfiles: 3,
    badge: "MOST POPULAR",
    features: [
      "3 Saved Percentile Profiles",
      "Everything included in Multi-Round Predictor",
      "MHT CET College Predictor",
      "All India Seat Predictor",
      "Vacant Seat Tracker",
      "Unlimited predictions using saved percentiles",
      "Personalized College & Branch Selection",
      "Personalized Admission Strategy",
      "Preference List Preparation",
      "CAP Form Filling Guidance",
      "1:1 Personal Counselling",
      "Complete guidance till CAP Round I, II & III",
      "WhatsApp Support",
      "Doubt Solving Assistance",
      "Branch selection guidance based on percentile",
      "College shortlisting assistance",
      "Save & Download Prediction Reports",
    ],
    highlight: true,
    ctaLabel: "Get Premium Support",
  },
  {
    id: "elite",
    name: "Elite Admission Support",
    price: 6000,
    description:
      "Complete end-to-end admission assistance, including Spot and Institute level rounds.",
    maxProfiles: 4,
    badge: "ELITE",
    features: [
      "4 Saved Percentile Profiles",
      "Everything included in Premium CAP Support",
      "MHT CET College Predictor",
      "All India Seat Predictor",
      "Vacant Seat Tracker",
      "Unlimited predictions using saved percentiles",
      "Spot Round Guidance",
      "Institute Level Round Guidance",
      "Management Round Guidance",
      "Personalized Admission Strategy",
      "Complete End-to-End Admission Assistance",
      "Continuous Admission Follow-up till final admission",
      "Priority WhatsApp Support",
      "Dedicated admission guidance",
      "College reporting assistance",
      "Final admission confirmation support",
      "Save & Download Prediction Reports",
    ],
    highlight: false,
    ctaLabel: "Get Elite Support",
  },
]

/** One saved Exam + Percentile profile */
export interface PercentileProfile {
  id: string
  exam: string
  percentile: number
  predictionType?: string
  examScores?: string | null
  round?: string
  gender?: string
  category?: string
  homeUniversity?: string
  disability?: boolean
  defenseQuota?: boolean
  preferredBranches?: string[]
  createdAt: string
  planId?: string | null
  isLocked?: boolean
  usageCount?: number
}

/** One saved Vacant Seat Tracker Category profile */
export interface TrackerCategoryProfile {
  id: string
  exam: string
  round: string
  category: string
  createdAt: string
  planId?: string | null
  isLocked?: boolean
  usageCount?: number
}

/** The user's subscription state (persisted in localStorage) */
export interface UserSubscription {
  plan: PlanId
  maxProfiles: number
  profiles: PercentileProfile[]
  trackerMaxProfiles: number
  trackerProfiles: TrackerCategoryProfile[]
  purchasedAddOns: number   // number of +1 profile add-ons purchased
  trackerPurchasedAddOns: number
  activatedAt: string
  singlePurchases?: Array<{
    id: string
    selectedRound: string | null
    isUsed: boolean
    trackerSelectedRound: string | null
    trackerIsUsed: boolean
  }>
}

export const ADDON_PRICE = 499

/** Default state when the user has no subscription */
export const DEFAULT_SUBSCRIPTION: UserSubscription = {
  plan: "single",
  maxProfiles: 0,          // 0 means not purchased yet
  profiles: [],
  trackerMaxProfiles: 0,
  trackerProfiles: [],
  purchasedAddOns: 0,
  trackerPurchasedAddOns: 0,
  activatedAt: "",
  singlePurchases: [],
}
