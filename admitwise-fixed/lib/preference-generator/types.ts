export interface PreferenceInput {
  percentile: number
  round: string // "Round 1" | "Round 2" | "Round 3" | "Round 4"
  preferredBranches: string[]
  preferredCities: string[] // e.g. ["ANY"] or ["Pune", "Mumbai"]
}

export interface PreferenceResultItem {
  id: string
  collegeCode: string
  collegeName: string
  branchCode: string
  branchName: string
  city: string
  status: string
  homeUniversity: string
  closingPercentile: number
  closingRank: number
  categoryUsed: string // "GOPENS" | "LOPENS"
  stageTag: "Dream" | "Target" | "Safe"
  priorityIndex: number
}

export interface DatasetOptions {
  branches: string[]
  cities: string[]
  datasetInfo: {
    id: string
    round: string
    uploadedAt: string
    rowCount: number
    version: number
  } | null
}

export interface PreferenceGenerateResponse {
  success: boolean
  isPaid: boolean
  savedPercentile?: number
  totalCount: number
  previewCount: number
  items: PreferenceResultItem[]
  error?: string
}
