import { PreferenceDatasetLoader } from "./dataset-loader"
import type { DatasetOptions, PreferenceInput, PreferenceResultItem } from "./types"

export interface BranchGroup {
  groupId: string
  displayName: string
  aliases: string[]
}

export const BRANCH_GROUPS: BranchGroup[] = [
  {
    groupId: "AI_DATA_SCIENCE",
    displayName: "Artificial Intelligence & Data Science",
    aliases: [
      "Artificial Intelligence (AI) and Data Science",
      "Artificial Intelligence and Data Science",
      "Artificial Intelligence (AI & DS)",
      "Artificial Intelligence & Data Science",
      "AI & Data Science",
      "Computer Science and Engineering(Data Science)",
    ],
  },
  {
    groupId: "AI_MACHINE_LEARNING",
    displayName: "Artificial Intelligence & Machine Learning",
    aliases: [
      "Artificial Intelligence and Machine Learning",
      "Artificial Intelligence (AI) and Machine Learning",
      "Artificial Intelligence & Machine Learning",
      "Artificial Intelligence (AIML)",
      "AI & Machine Learning",
      "Computer Science and Engineering(Artificial Intelligence and Machine Learning)",
      "Artificial Intelligence",
    ],
  },
  {
    groupId: "COMPUTER_SCIENCE",
    displayName: "Computer Science",
    aliases: [
      "Computer Science",
      "Computer Science and Engineering",
      "Computer Science & Engineering",
    ],
  },
  {
    groupId: "COMPUTER_ENGINEERING",
    displayName: "Computer Engineering",
    aliases: [
      "Computer Engineering",
    ],
  },
  {
    groupId: "INFORMATION_TECHNOLOGY",
    displayName: "Information Technology",
    aliases: [
      "Information Technology",
      "Information Tech",
    ],
  },
  {
    groupId: "ELECTRONICS_TELECOMM",
    displayName: "Electronics & Telecommunication Engineering",
    aliases: [
      "Electronics and Telecommunication Engg",
      "Electronics & Telecommunication Engineering",
      "Electronics and Communication Engineering",
      "Electronics and Telecommunication Engineering",
    ],
  },
  {
    groupId: "MECHANICAL_ENGINEERING",
    displayName: "Mechanical Engineering",
    aliases: [
      "Mechanical Engineering",
      "Mechanical Engg",
    ],
  },
  {
    groupId: "ELECTRICAL_ENGINEERING",
    displayName: "Electrical Engineering",
    aliases: [
      "Electrical Engineering",
      "Electrical Engg[Electronics and Power]",
      "Electrical and Electronics Engineering",
    ],
  },
  {
    groupId: "CIVIL_ENGINEERING",
    displayName: "Civil Engineering",
    aliases: [
      "Civil Engineering",
      "Civil Engg",
    ],
  },
]

export function normalizeBranchName(branchName: string): { groupId: string; displayName: string; matchedAliases: string[] } {
  const norm = branchName.trim().toLowerCase()

  for (const group of BRANCH_GROUPS) {
    for (const alias of group.aliases) {
      if (alias.trim().toLowerCase() === norm) {
        return {
          groupId: group.groupId,
          displayName: group.displayName,
          matchedAliases: group.aliases,
        }
      }
    }
  }

  return {
    groupId: `BRANCH_${branchName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_")}`,
    displayName: branchName.trim(),
    matchedAliases: [branchName.trim()],
  }
}

export const CUSTOM_CITY_ORDER: string[] = [
  "ANY",
  "Pune",
  "Mumbai",
  "Nashik",
  "Nagpur",
  "Chhatrapati Sambhajinagar",
  "Ahilyanagar",
  "Amravati",
  "Sangli",
  "Satara",
  "Kolhapur",
  "Nanded",
  "Solapur",
  "Latur",
  "Jalgaon",
  "Raigad",
  "Chandrapur",
  "Yavatmal",
]

export class PreferenceGeneratorService {
  /**
   * Fetches dataset metadata, distinct branches (alphabetically sorted), and distinct cities (ordered by CUSTOM_CITY_ORDER) for a given CAP Round directly from the /dataset folder.
   */
  static async getDatasetOptions(round: string): Promise<DatasetOptions & { error?: string }> {
    try {
      const res = PreferenceDatasetLoader.loadDatasetForRound(round)

      if (!res.success) {
        return {
          branches: [],
          cities: [],
          datasetInfo: null,
          error: res.error,
        }
      }

      // Extract unique branches, cities, and categories
      const branchesSet = new Set<string>()
      const citiesSet = new Set<string>()
      const categoriesSet = new Set<string>()

      for (const item of res.records) {
        if (item.branchName) branchesSet.add(item.branchName.trim())
        if (item.city) citiesSet.add(item.city.trim())
        if (item.category) categoriesSet.add(item.category.trim())
      }

      const branches = Array.from(branchesSet).sort((a, b) => a.localeCompare(b))

      // Preserve CUSTOM_CITY_ORDER for cities dropdown
      const cities: string[] = []
      const datasetCities = Array.from(citiesSet)

      for (const customCity of CUSTOM_CITY_ORDER) {
        cities.push(customCity)
      }

      for (const dCity of datasetCities) {
        if (!cities.some((c) => c.toLowerCase() === dCity.toLowerCase())) {
          cities.push(dCity)
        }
      }

      // Preserve preferred category order
      const CATEGORY_ORDER = ["OPEN", "OBC", "SC", "ST", "EWS", "NT-A", "NT-B", "NT-C", "NT-D", "SEBC", "TFWS", "ORPHAN", "MI"]
      const categories: string[] = []
      for (const cat of CATEGORY_ORDER) {
        if (categoriesSet.has(cat)) categories.push(cat)
      }
      for (const cat of Array.from(categoriesSet).sort()) {
        if (!categories.includes(cat)) categories.push(cat)
      }

      return {
        branches,
        cities,
        categories,
        datasetInfo: {
          id: res.fileName,
          round: res.roundName,
          uploadedAt: new Date().toISOString(),
          rowCount: res.records.length,
          version: 1,
        },
      }
    } catch (error: any) {
      console.error("Error in PreferenceGeneratorService.getDatasetOptions:", error)
      return {
        branches: [],
        cities: [],
        categories: [],
        datasetInfo: null,
        error: "Failed to load options for the selected CAP Round.",
      }
    }
  }

  /**
   * Core Preference List Generation Algorithm following student percentile, CAP round, branch priorities (grouped by aliases), and city priorities.
   */
  static async generatePreferenceList(
    input: PreferenceInput
  ): Promise<{ items: PreferenceResultItem[]; error?: string }> {
    const { percentile, round, preferredBranches, preferredCities } = input

    // Destructure new optional filters (defaults: OPEN, Male, No)
    const reqCategory = (input.category || "OPEN").trim().toUpperCase()
    const reqGender   = (input.gender || "Male").trim().toLowerCase()
    const reqPwd      = (input.pwd || "No").trim().toLowerCase()

    // 1. Load CSV dataset directly from the /dataset folder for the selected CAP Round
    const res = PreferenceDatasetLoader.loadDatasetForRound(round)
    if (!res.success) {
      return { items: [], error: res.error }
    }

    // 2. City Filter Setup (Cities ONLY filter dataset, they do NOT order results)
    const isAnyCity =
      !preferredCities ||
      preferredCities.length === 0 ||
      preferredCities.some((c) => c.trim().toUpperCase() === "ANY")

    const selectedCitiesSet = new Set(preferredCities.map((c) => c.trim().toLowerCase()))

    // 3. Apply City, Category, Gender, and PwD filters upfront
    const rawCutoffs = res.records.filter((r) => {
      // Must have valid closing percentile
      if (r.closingPercentile < 0 || r.closingPercentile > 100) return false

      // City Filter (WHERE city IN selectedCities)
      if (!isAnyCity && !selectedCitiesSet.has(r.city.trim().toLowerCase())) {
        return false
      }

      // PwD Filter
      const rDis = r.disability.trim().toLowerCase()
      const rawCode = r.categoryCodeRaw.toUpperCase()
      if (reqPwd === "yes") {
        if (rDis !== "yes" && !rawCode.startsWith("PWD")) return false
      } else {
        if (rDis === "yes" || rawCode.startsWith("PWD")) return false
      }

      // Gender Filter for Male candidates
      const rGen = r.gender.trim().toLowerCase()
      if (reqGender === "male") {
        if (rGen === "female" || (rawCode.startsWith("L") && !rawCode.startsWith("LOG"))) {
          return false
        }
      }

      // Category Filter (Candidate category OR OPEN fallback)
      const rCat = r.category.trim().toUpperCase()
      const isCandidateCat =
        rCat === reqCategory ||
        (reqCategory === "NT-A" && (rCat === "NT-A" || rawCode.includes("VJ") || rawCode.includes("NT1"))) ||
        (reqCategory === "NT-B" && (rCat === "NT-B" || rawCode.includes("NT1") || rawCode.includes("NT2"))) ||
        (reqCategory === "NT-C" && (rCat === "NT-C" || rawCode.includes("NT2") || rawCode.includes("NT3"))) ||
        (reqCategory === "NT-D" && (rCat === "NT-D" || rawCode.includes("NT3") || rawCode.includes("VJ"))) ||
        (reqCategory === "SBC" && (rCat === "SBC" || rCat === "OBC"))

      const isOpen = rCat === "OPEN" || rawCode.startsWith("GOPEN") || rawCode.startsWith("LOPEN")

      return isCandidateCat || isOpen
    })

    if (!rawCutoffs || rawCutoffs.length === 0) {
      return { items: [] }
    }

    // Deduplication per College Code + Branch Code:
    // Prefer candidate's exact category row over OPEN fallback, and break ties by higher closingPercentile.
    function getCategoryScore(item: typeof res.records[0]): number {
      const cat = item.category.trim().toUpperCase()
      const raw = item.categoryCodeRaw.trim().toUpperCase()
      let score = 0
      if (cat === reqCategory) score += 100
      else if (reqCategory !== "OPEN" && cat === "OPEN") score += 50

      if (reqGender === "female" && (item.gender.trim().toLowerCase() === "female" || raw.startsWith("L"))) {
        score += 10
      }
      return score
    }

    const collegeBranchMap = new Map<string, typeof rawCutoffs[0]>()

    for (const item of rawCutoffs) {
      const key = `${item.collegeCode}_${item.branchCode}`
      const existing = collegeBranchMap.get(key)
      if (!existing) {
        collegeBranchMap.set(key, item)
      } else {
        const itemScore = getCategoryScore(item)
        const existingScore = getCategoryScore(existing)
        if (itemScore > existingScore) {
          collegeBranchMap.set(key, item)
        } else if (itemScore === existingScore && item.closingPercentile > existing.closingPercentile) {
          collegeBranchMap.set(key, item)
        }
      }
    }

    const filteredRecords = Array.from(collegeBranchMap.values())

    // 4. Stage Ranges (Dream, Target, Safe)
    const targetMin = Math.max(0, percentile - 5)
    const safeMin = Math.max(0, percentile - 15)

    function getStageTag(cp: number): "Dream" | "Target" | "Safe" | null {
      if (cp > percentile && cp <= 100) return "Dream"
      if (cp <= percentile && cp >= targetMin) return "Target"
      if (cp < targetMin && cp >= safeMin) return "Safe"
      return null
    }

    // 5. Normalize & Deduplicate Student Branch Priorities into Branch Groups
    const selectedGroupMap = new Map<string, { groupId: string; displayName: string; matchedAliases: string[] }>()
    const orderedBranchGroups: { groupId: string; displayName: string; matchedAliases: string[] }[] = []

    for (const userBranch of preferredBranches) {
      const groupInfo = normalizeBranchName(userBranch)
      if (!selectedGroupMap.has(groupInfo.groupId)) {
        selectedGroupMap.set(groupInfo.groupId, groupInfo)
        orderedBranchGroups.push(groupInfo)
      }
    }

    const stages: ("Dream" | "Target" | "Safe")[] = ["Dream", "Target", "Safe"]
    const resultList: PreferenceResultItem[] = []
    const addedKeys = new Set<string>()

    // 6. Ordering Hierarchy: Stage -> Branch Group Priority -> Closing Percentile DESC
    for (const stage of stages) {
      for (const group of orderedBranchGroups) {
        const aliasNormSet = new Set(group.matchedAliases.map((a) => a.trim().toLowerCase()))

        const bucket = filteredRecords.filter((rec) => {
          const stageTag = getStageTag(rec.closingPercentile)
          if (stageTag !== stage) return false
          if (!aliasNormSet.has(rec.branchName.trim().toLowerCase())) return false

          const dedupeKey = `${stage}_${rec.collegeCode}_${group.groupId}`
          return !addedKeys.has(dedupeKey)
        })

        // Sort bucket by closingPercentile DESCENDING
        bucket.sort((a, b) => b.closingPercentile - a.closingPercentile)

        for (const item of bucket) {
          const dedupeKey = `${stage}_${item.collegeCode}_${group.groupId}`
          addedKeys.add(dedupeKey)

          resultList.push({
            id: item.id,
            collegeCode: item.collegeCode,
            collegeName: item.collegeName,
            branchCode: item.branchCode,
            branchName: item.branchName,
            city: item.city,
            status: item.status,
            homeUniversity: item.homeUniversity,
            closingPercentile: item.closingPercentile,
            closingRank: item.closingRank,
            categoryUsed: item.categoryCodeRaw,
            stageTag: stage,
            priorityIndex: resultList.length + 1,
          })
        }
      }
    }

    return { items: resultList }
  }
}
