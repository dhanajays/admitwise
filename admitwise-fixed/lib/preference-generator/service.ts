import { PreferenceDatasetLoader } from "./dataset-loader"
import type { DatasetOptions, PreferenceInput, PreferenceResultItem } from "./types"

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
        if (item.branchName) branchesSet.add(item.branchName)
        if (item.city) citiesSet.add(item.city)
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
   * Core Preference List Generation Algorithm following student percentile, CAP round, branch priorities, and city priorities.
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

    // Step 2A: Add GOPENS records first
    for (const item of rawCutoffs) {
      const key = `${item.collegeCode}_${item.branchCode}`
      if (item.categoryCodeRaw === "GOPENS") {
        collegeBranchMap.set(key, item)
      }
    }

    // Step 2B: Fallback to LOPENS if no GOPENS record exists for that college-branch
    for (const item of rawCutoffs) {
      const key = `${item.collegeCode}_${item.branchCode}`
      if (item.categoryCodeRaw === "LOPENS" && !collegeBranchMap.has(key)) {
        collegeBranchMap.set(key, item)
      }
    }

    const filteredRecords = Array.from(collegeBranchMap.values())

    // 3. Stage Ranges (Dream, Target, Safe)
    // Dream: > percentile and <= 100
    // Target: <= percentile and >= percentile - 5
    // Safe: < percentile - 5 and >= percentile - 15
    const targetMin = Math.max(0, percentile - 5)
    const safeMin = Math.max(0, percentile - 15)

    function getStageTag(cp: number): "Dream" | "Target" | "Safe" | null {
      if (cp > percentile && cp <= 100) return "Dream"
      if (cp <= percentile && cp >= targetMin) return "Target"
      if (cp < targetMin && cp >= safeMin) return "Safe"
      return null
    }

    // Normalize user branch & city inputs
    const userBranches = preferredBranches.map((b) => b.trim())
    const isAnyCity =
      !preferredCities ||
      preferredCities.length === 0 ||
      preferredCities.some((c) => c.trim().toUpperCase() === "ANY")

    const userCities = isAnyCity ? ["ANY"] : preferredCities.map((c) => c.trim())

    const stages: ("Dream" | "Target" | "Safe")[] = ["Dream", "Target", "Safe"]
    const resultList: PreferenceResultItem[] = []
    const addedIds = new Set<string>()

    // Exact Branch Matching Rule: Only match exact branch name (case-insensitive & trimmed)
    const isExactBranchMatch = (actualBranch: string, targetBranch: string) => {
      return actualBranch.trim().toLowerCase() === targetBranch.trim().toLowerCase()
    }

    // 4. Algorithm Ordering Execution
    for (const stage of stages) {
      if (isAnyCity) {
        // Case 1: "ANY" City Selected
        // Hierarchy: Stage -> Branch Priority -> Closing Percentile DESC
        for (const branchPref of userBranches) {
          const bucket = filteredRecords.filter((rec) => {
            const stageTag = getStageTag(rec.closingPercentile)
            if (stageTag !== stage) return false
            if (!isExactBranchMatch(rec.branchName, branchPref)) return false
            return !addedIds.has(rec.id)
          })

          // Sort bucket by closingPercentile DESC
          bucket.sort((a, b) => b.closingPercentile - a.closingPercentile)

          for (const item of bucket) {
            addedIds.add(item.id)
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
        // Case 2: Specific Cities Selected
        // Hierarchy: Stage -> City Priority -> Branch Priority -> Closing Percentile DESC
        for (const cityPref of userCities) {
          for (const branchPref of userBranches) {
            const bucket = filteredRecords.filter((rec) => {
              const stageTag = getStageTag(rec.closingPercentile)
              if (stageTag !== stage) return false
              if (rec.city.trim().toLowerCase() !== cityPref.toLowerCase()) return false
              if (!isExactBranchMatch(rec.branchName, branchPref)) return false
              return !addedIds.has(rec.id)
            })

            // Sort bucket by closingPercentile DESC
            bucket.sort((a, b) => b.closingPercentile - a.closingPercentile)

            for (const item of bucket) {
              addedIds.add(item.id)
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
