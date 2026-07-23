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

export class PreferenceGeneratorService {
  /**
   * Fetches dataset metadata, distinct branches (alphabetically sorted), and distinct cities for a given CAP Round directly from the /dataset folder.
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

      // Extract unique branches and cities (alphabetically sorted)
      const branchesSet = new Set<string>()
      const citiesSet = new Set<string>()

      for (const item of res.records) {
        if (item.branchName) branchesSet.add(item.branchName.trim())
        if (item.city) citiesSet.add(item.city.trim())
      }

      const branches = Array.from(branchesSet).sort((a, b) => a.localeCompare(b))
      const cities = Array.from(citiesSet).sort((a, b) => a.localeCompare(b))

      return {
        branches,
        cities,
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

    // 1. Load CSV dataset directly from the /dataset folder for the selected CAP Round
    const res = PreferenceDatasetLoader.loadDatasetForRound(round)
    if (!res.success) {
      return { items: [], error: res.error }
    }

    // 2. Category Filtering Rule:
    // Consider GOPENS & LOPENS in range [0 -> 100] percentile
    const rawCutoffs = res.records.filter(
      (r) =>
        (r.categoryCodeRaw === "GOPENS" || r.categoryCodeRaw === "LOPENS") &&
        r.closingPercentile >= 0 &&
        r.closingPercentile <= 100
    )

    if (!rawCutoffs || rawCutoffs.length === 0) {
      return { items: [] }
    }

    // For each college_code + branch_code, keep GOPENS first. Fallback to LOPENS if no GOPENS exists.
    const collegeBranchMap = new Map<string, typeof rawCutoffs[0]>()

    for (const item of rawCutoffs) {
      const key = `${item.collegeCode}_${item.branchCode}`
      if (item.categoryCodeRaw === "GOPENS") {
        collegeBranchMap.set(key, item)
      }
    }

    for (const item of rawCutoffs) {
      const key = `${item.collegeCode}_${item.branchCode}`
      if (item.categoryCodeRaw === "LOPENS" && !collegeBranchMap.has(key)) {
        collegeBranchMap.set(key, item)
      }
    }

    const filteredRecords = Array.from(collegeBranchMap.values())

    // 3. Stage Ranges (Dream, Target, Safe)
    const targetMin = Math.max(0, percentile - 5)
    const safeMin = Math.max(0, percentile - 15)

    function getStageTag(cp: number): "Dream" | "Target" | "Safe" | null {
      if (cp > percentile && cp <= 100) return "Dream"
      if (cp <= percentile && cp >= targetMin) return "Target"
      if (cp < targetMin && cp >= safeMin) return "Safe"
      return null
    }

    // 4. Normalize & Deduplicate Student Branch Priorities into Branch Groups
    const selectedGroupMap = new Map<string, { groupId: string; displayName: string; matchedAliases: string[] }>()
    const orderedBranchGroups: { groupId: string; displayName: string; matchedAliases: string[] }[] = []

    for (const userBranch of preferredBranches) {
      const groupInfo = normalizeBranchName(userBranch)
      if (!selectedGroupMap.has(groupInfo.groupId)) {
        selectedGroupMap.set(groupInfo.groupId, groupInfo)
        orderedBranchGroups.push(groupInfo)
      }
    }

    // Normalize City Inputs
    const isAnyCity =
      !preferredCities ||
      preferredCities.length === 0 ||
      preferredCities.some((c) => c.trim().toUpperCase() === "ANY")

    const userCities = isAnyCity ? ["ANY"] : preferredCities.map((c) => c.trim())

    const stages: ("Dream" | "Target" | "Safe")[] = ["Dream", "Target", "Safe"]
    const resultList: PreferenceResultItem[] = []
    const addedKeys = new Set<string>()

    // 5. Algorithm Execution with Branch Group Aliases
    for (const stage of stages) {
      if (isAnyCity) {
        // Hierarchy: Stage -> Branch Group Priority -> Closing Percentile DESC
        for (const group of orderedBranchGroups) {
          const aliasNormSet = new Set(group.matchedAliases.map((a) => a.trim().toLowerCase()))

          const bucket = filteredRecords.filter((rec) => {
            const stageTag = getStageTag(rec.closingPercentile)
            if (stageTag !== stage) return false
            if (!aliasNormSet.has(rec.branchName.trim().toLowerCase())) return false

            const dedupeKey = `${stage}_${rec.collegeCode}_${group.groupId}`
            return !addedKeys.has(dedupeKey)
          })

          // Sort bucket by closingPercentile DESC
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
      } else {
        // Hierarchy: Stage -> City Priority -> Branch Group Priority -> Closing Percentile DESC
        for (const cityPref of userCities) {
          for (const group of orderedBranchGroups) {
            const aliasNormSet = new Set(group.matchedAliases.map((a) => a.trim().toLowerCase()))

            const bucket = filteredRecords.filter((rec) => {
              const stageTag = getStageTag(rec.closingPercentile)
              if (stageTag !== stage) return false
              if (rec.city.trim().toLowerCase() !== cityPref.toLowerCase()) return false
              if (!aliasNormSet.has(rec.branchName.trim().toLowerCase())) return false

              const dedupeKey = `${stage}_${rec.collegeCode}_${group.groupId}`
              return !addedKeys.has(dedupeKey)
            })

            // Sort bucket by closingPercentile DESC
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
      }
    }

    return { items: resultList }
  }
}
