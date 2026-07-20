export type ChanceBand =
  | "Very High"
  | "High"
  | "Moderate"
  | "Low"
  | "Very Low"

/**
 * One row from the cutoffs CSV, fully typed against the actual columns.
 * The CSV has NO year / exam / round columns — those are synthetic defaults.
 */
export interface CutoffRow {
  /** Synthetic – always "MHT CET PCM" (not in CSV) */
  exam: string

  college_code: string
  college_name: string

  branch_code: string
  branch_name: string

  status: string
  home_university: string
  seat_section: string

  /** "I" or "II" — maps to CAP round 1 or 2 */
  stage: string

  /** Raw code from CSV, e.g. "GOPENS", "LOBCS" */
  category_code_raw: string

  /** Clean category name: OPEN, OBC, SC, ST, EWS, SEBC, NT-A … */
  category: string

  /** "Female" | "Not Specified" */
  gender: string

  /** "Yes" | "No" */
  disability: string

  /** "Yes" | "No" */
  defense_quota: string

  closing_rank: number
  closing_percentile: number
}

export interface StudentInput {
  predictionType?: string // "mht-cet" or "all-india"
  examsList?: Array<{ exam: string; percentile: number }>
  exam: string
  percentile: number
  gender: string
  category: string
  homeUniversity: string
  stage: string // CAP Stage/Round mapping
  disability: boolean
  disabilityType?: string
  defenseQuota: boolean
  preferredBranches: string[]
  searchQuery?: string
  filterChance?: string
  filterBranch?: string
  sortKey?: string
}

export interface PredictionResult {
  rank: number

  collegeCode: string
  collegeName: string

  branchCode: string
  branchName: string

  category: string
  seatSection: string
  status: string

  closingPercentile: number
  closingRank: number

  margin: number

  chance: ChanceBand
  chanceScore: number
  confidence: number

  eligible: boolean
  branchMatch: boolean
  homeUniversityRelevant: boolean

  reasons: string[]

  // All India Predictor fields
  matchedUsing?: string
  closingAllIndiaMerit?: number
  admissionType?: string
  seatType?: string

  // Search fields
  homeUniversity?: string
  instituteType?: string
}
