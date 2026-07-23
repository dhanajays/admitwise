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
    input: PreferenceInput,
    limit?: number
  ): Promise<{ items: PreferenceResultItem[]; error?: string }> {
    const { percentile, round, preferredBranches, preferredCities } = input

    // Candidate Profile Inputs
    const reqCategory = (input.category || "OPEN").trim().toUpperCase()
    const reqGender   = (input.gender || "Male").trim().toLowerCase()
    const reqPwd      = (input.pwd || "No").trim().toLowerCase()
    const isFemale    = reqGender === "female"

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

    // ========================================================
    // ENGINE 1: Preference Ranking Engine
    // Purpose: Rank colleges strictly based on academic quality (GOPENS / LOPENS), NOT reservation category.
    // ========================================================
    const openTargetCode = isFemale ? "LOPENS" : "GOPENS"

    // Filter Open rows for ranking (non-PwD Open statewide/regional seats)
    const openRecords = res.records.filter((r) => {
      if (r.closingPercentile < 0 || r.closingPercentile > 100) return false

      // City filter
      if (!isAnyCity && !selectedCitiesSet.has(r.city.trim().toLowerCase())) {
        return false
      }

      // Ignore PwD seats for Open ranking
      if (r.disability.trim().toLowerCase() === "yes" || r.categoryCodeRaw.toUpperCase().startsWith("PWD")) {
        return false
      }

      const rawCode = r.categoryCodeRaw.trim().toUpperCase()

      // Match Open seats: GOPENS/LOPENS or regional GOPENH/GOPENO/LOPENH/LOPENO
      if (isFemale) {
        return (
          rawCode === "LOPENS" ||
          rawCode === "GOPENS" ||
          rawCode === "LOPENH" ||
          rawCode === "LOPENO" ||
          rawCode === "GOPENH" ||
          rawCode === "GOPENO" ||
          r.category.trim().toUpperCase() === "OPEN"
        )
      } else {
        // Male: exclude female-only L seats
        return (
          rawCode === "GOPENS" ||
          rawCode === "GOPENH" ||
          rawCode === "GOPENO" ||
          (r.category.trim().toUpperCase() === "OPEN" && !rawCode.startsWith("L"))
        )
      }
    })

    if (!openRecords || openRecords.length === 0) {
      return { items: [] }
    }

    // Deduplicate Open rows per College Code + Branch Code for Engine 1
    // Prefer GOPENS/LOPENS over regional codes, break ties by higher closingPercentile
    const openMap = new Map<string, typeof openRecords[0]>()

    for (const item of openRecords) {
      const key = `${item.collegeCode}_${item.branchCode}`
      const existing = openMap.get(key)
      if (!existing) {
        openMap.set(key, item)
      } else {
        const itemRaw = item.categoryCodeRaw.toUpperCase()
        const exRaw = existing.categoryCodeRaw.toUpperCase()
        const itemIsTarget = itemRaw === openTargetCode
        const exIsTarget = exRaw === openTargetCode
        if (itemIsTarget && !exIsTarget) {
          openMap.set(key, item)
        } else if (itemIsTarget === exIsTarget && item.closingPercentile > existing.closingPercentile) {
          openMap.set(key, item)
        }
      }
    }

    const deduplicatedOpen = Array.from(openMap.values())

    // 3. Normalize & Deduplicate Student Branch Priorities into Branch Groups
    const selectedGroupMap = new Map<string, { groupId: string; displayName: string; matchedAliases: string[] }>()
    const orderedBranchGroups: { groupId: string; displayName: string; matchedAliases: string[] }[] = []

    for (const userBranch of preferredBranches) {
      const groupInfo = normalizeBranchName(userBranch)
      if (!selectedGroupMap.has(groupInfo.groupId)) {
        selectedGroupMap.set(groupInfo.groupId, groupInfo)
        orderedBranchGroups.push(groupInfo)
      }
    }

    // 4. Group Open records by College & calculate CollegeScore (Max Open Cutoff among student's preferred branches)
    interface CollegeGroup {
      collegeCode: string
      collegeName: string
      city: string
      collegeScore: number
      branchMap: Map<string, typeof deduplicatedOpen[0]>
    }

    const collegeGroupMap = new Map<string, CollegeGroup>()

    for (const rec of deduplicatedOpen) {
      const recBranchNorm = rec.branchName.trim().toLowerCase()
      let matchedGroup: { groupId: string; displayName: string; matchedAliases: string[] } | null = null

      for (const group of orderedBranchGroups) {
        if (group.matchedAliases.some((a) => a.trim().toLowerCase() === recBranchNorm)) {
          matchedGroup = group
          break
        }
      }

      if (!matchedGroup) continue // Skip branches not in student's preferred list

      const colCode = rec.collegeCode
      let colGroup = collegeGroupMap.get(colCode)

      if (!colGroup) {
        colGroup = {
          collegeCode: colCode,
          collegeName: rec.collegeName,
          city: rec.city,
          collegeScore: rec.closingPercentile,
          branchMap: new Map(),
        }
        collegeGroupMap.set(colCode, colGroup)
      }

      // CollegeScore is the Highest Open Cutoff among student's preferred branches
      if (rec.closingPercentile > colGroup.collegeScore) {
        colGroup.collegeScore = rec.closingPercentile
      }

      const existingBranchRec = colGroup.branchMap.get(matchedGroup.groupId)
      if (!existingBranchRec || rec.closingPercentile > existingBranchRec.closingPercentile) {
        colGroup.branchMap.set(matchedGroup.groupId, rec)
      }
    }

    // Sort Colleges by CollegeScore DESCENDING (Highest Open Cutoff first)
    const rankedColleges = Array.from(collegeGroupMap.values()).sort((a, b) => b.collegeScore - a.collegeScore)

    // 5. Engine 1 Stage Ranges (Dream, Target, Safe calculated against Open Cutoffs!)
    const targetMin = Math.max(0, percentile - 5)
    const safeMin = Math.max(0, percentile - 15)

    function getStageTag(cp: number): "Dream" | "Target" | "Safe" | null {
      if (cp > percentile && cp <= 100) return "Dream"
      if (cp <= percentile && cp >= targetMin) return "Target"
      if (cp < targetMin && cp >= safeMin) return "Safe"
      return null
    }

    const stages: ("Dream" | "Target" | "Safe")[] = ["Dream", "Target", "Safe"]
    const engine1Ranked: { stage: "Dream" | "Target" | "Safe"; openItem: typeof deduplicatedOpen[0] }[] = []
    const addedKeys = new Set<string>()

    // 6. College-First Ranking: Stage -> College (by CollegeScore DESC) -> Student Branch Priority Order
    for (const stage of stages) {
      for (const col of rankedColleges) {
        for (const group of orderedBranchGroups) {
          const rec = col.branchMap.get(group.groupId)
          if (!rec) continue

          const stageTag = getStageTag(rec.closingPercentile)
          if (stageTag !== stage) continue

          const dedupeKey = `${stage}_${col.collegeCode}_${group.groupId}`
          if (addedKeys.has(dedupeKey)) continue
          addedKeys.add(dedupeKey)

          engine1Ranked.push({ stage, openItem: rec })
        }
      }
    }

    // ========================================================
    // ENGINE 2: Eligibility Engine
    // Purpose: Calculate student's REAL admission chance using their Category, Gender, PwD.
    // ========================================================
    const isPwd = reqPwd === "yes"

    const finalResultList: PreferenceResultItem[] = engine1Ranked.map(({ stage, openItem }, idx) => {
      const colCode = openItem.collegeCode
      const brCode = openItem.branchCode

      // Find all rows for this specific college & branch in the dataset
      const collegeBranchRows = res.records.filter(
        (r) => r.collegeCode === colCode && r.branchCode === brCode && r.closingPercentile >= 0
      )

      // Search for candidate's category/gender/pwd matching row
      let catRow: typeof res.records[0] | undefined = undefined

      if (isPwd) {
        catRow = collegeBranchRows.find((r) => {
          const dis = r.disability.trim().toLowerCase()
          const raw = r.categoryCodeRaw.trim().toUpperCase()
          const cat = r.category.trim().toUpperCase()
          if (dis !== "yes" && !raw.startsWith("PWD")) return false
          return cat === reqCategory || raw.includes(reqCategory)
        })
        if (!catRow) {
          catRow = collegeBranchRows.find((r) => {
            const dis = r.disability.trim().toLowerCase()
            const raw = r.categoryCodeRaw.trim().toUpperCase()
            return dis === "yes" || raw.startsWith("PWD")
          })
        }
      } else {
        if (isFemale) {
          catRow = collegeBranchRows.find((r) => {
            const cat = r.category.trim().toUpperCase()
            const gen = r.gender.trim().toLowerCase()
            const raw = r.categoryCodeRaw.trim().toUpperCase()
            if (r.disability.trim().toLowerCase() === "yes" || raw.startsWith("PWD")) return false
            return (cat === reqCategory || raw.includes(reqCategory)) && (gen === "female" || raw.startsWith("L"))
          })
        }
        if (!catRow) {
          catRow = collegeBranchRows.find((r) => {
            const cat = r.category.trim().toUpperCase()
            const raw = r.categoryCodeRaw.trim().toUpperCase()
            if (r.disability.trim().toLowerCase() === "yes" || raw.startsWith("PWD")) return false
            return cat === reqCategory || raw.includes(reqCategory)
          })
        }
      }

      // Fallback to Open row if no category row exists
      const effectiveCategoryRow = catRow || openItem

      const openClosingPercentile = openItem.closingPercentile
      const openClosingRank = openItem.closingRank
      const openCategoryCode = openItem.categoryCodeRaw || (isFemale ? "LOPENS" : "GOPENS")

      const categoryClosingPercentile = effectiveCategoryRow.closingPercentile
      const categoryClosingRank = effectiveCategoryRow.closingRank
      const categoryUsed = effectiveCategoryRow.categoryCodeRaw || openCategoryCode

      // Compute Chance
      const diff = percentile - categoryClosingPercentile
      let chance: "Very Safe" | "Safe" | "Good Match" | "Borderline" | "Difficult" | "Very Difficult" = "Borderline"
      let chanceLabel = "BORDERLINE"
      let chanceColor = "bg-amber-50 text-amber-700 border-amber-200"

      if (diff >= 10) {
        chance = "Very Safe"
        chanceLabel = "VERY SAFE"
        chanceColor = "bg-emerald-50 text-emerald-700 border-emerald-200"
      } else if (diff >= 5) {
        chance = "Safe"
        chanceLabel = "SAFE"
        chanceColor = "bg-emerald-50 text-emerald-700 border-emerald-200"
      } else if (diff >= 2) {
        chance = "Good Match"
        chanceLabel = "GOOD MATCH"
        chanceColor = "bg-blue-50 text-blue-700 border-blue-200"
      } else if (diff >= 0) {
        chance = "Borderline"
        chanceLabel = "BORDERLINE"
        chanceColor = "bg-amber-50 text-amber-700 border-amber-200"
      } else if (diff >= -5) {
        chance = "Difficult"
        chanceLabel = "DIFFICULT"
        chanceColor = "bg-orange-50 text-orange-700 border-orange-200"
      } else {
        chance = "Very Difficult"
        chanceLabel = "VERY DIFFICULT"
        chanceColor = "bg-rose-50 text-rose-700 border-rose-200"
      }

      return {
        id: openItem.id,
        collegeCode: openItem.collegeCode,
        collegeName: openItem.collegeName,
        branchCode: openItem.branchCode,
        branchName: openItem.branchName,
        city: openItem.city,
        status: openItem.status,
        homeUniversity: openItem.homeUniversity,
        openClosingPercentile,
        openClosingRank,
        openCategoryCode,
        categoryClosingPercentile,
        categoryClosingRank,
        categoryUsed,
        chance,
        chanceLabel,
        chanceColor,
        closingPercentile: openClosingPercentile,
        closingRank: openClosingRank,
        stageTag: stage,
        priorityIndex: idx + 1,
      }
    })

    const items = typeof limit === "number" && limit > 0 ? finalResultList.slice(0, limit) : finalResultList
    return { items }
  }
}
