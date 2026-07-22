import { PreferenceDatasetLoader } from "./dataset-loader"
import type { DatasetOptions, PreferenceInput, PreferenceResultItem } from "./types"

export class PreferenceGeneratorService {
  /**
   * Fetches dataset metadata, distinct branches (alphabetically), and distinct cities for a given CAP Round directly from the /dataset folder.
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

      // Extract unique branches (alphabetically sorted)
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
   * Generates the preference list following student percentile, CAP round, branch priorities, and city priorities.
   */
  static async generatePreferenceList(
    input: PreferenceInput
  ): Promise<{ items: PreferenceResultItem[]; error?: string }> {
    const { percentile, round, preferredBranches, preferredCities } = input

    const res = PreferenceDatasetLoader.loadDatasetForRound(round)
    if (!res.success) {
      return { items: [], error: res.error }
    }

    const cutoffs = res.records.filter(
      (r) =>
        (r.categoryCodeRaw === "GOPENS" || r.categoryCodeRaw === "LOPENS") &&
        r.closingPercentile >= 30 &&
        r.closingPercentile <= 100
    )

    if (!cutoffs || cutoffs.length === 0) {
      return { items: [] }
    }

    // Step 1: For each college_code + branch_code, keep GOPENS first. Fallback to LOPENS if no GOPENS exists.
    const collegeBranchMap = new Map<string, typeof cutoffs[0]>()

    // Process GOPENS first
    for (const item of cutoffs) {
      const key = `${item.collegeCode}_${item.branchCode}`
      if (item.categoryCodeRaw === "GOPENS") {
        collegeBranchMap.set(key, item)
      }
    }

    // Fallback to LOPENS if no GOPENS record
    for (const item of cutoffs) {
      const key = `${item.collegeCode}_${item.branchCode}`
      if (item.categoryCodeRaw === "LOPENS" && !collegeBranchMap.has(key)) {
        collegeBranchMap.set(key, item)
      }
    }

    const filteredRecords = Array.from(collegeBranchMap.values())

    // Define Percentile Stages
    const goodMin = Math.max(0, percentile - 5) // 100 -> (Percentile - 5)
    const moderateMin = 50                       // (Percentile - 5) -> 50
    const safeMin = 30                           // 50 -> 30

    function getStageTag(cp: number): "Good" | "Moderate" | "Safe" | null {
      if (cp >= goodMin && cp <= 100) return "Good"
      if (cp >= moderateMin && cp < goodMin) return "Moderate"
      if (cp >= safeMin && cp < moderateMin) return "Safe"
      return null
    }

    // Normalize user selections
    const normBranches = preferredBranches.map((b) => b.trim().toLowerCase())
    const isAnyCity =
      !preferredCities ||
      preferredCities.length === 0 ||
      preferredCities.some((c) => c.trim().toUpperCase() === "ANY")

    const normCities = isAnyCity ? ["ANY"] : preferredCities.map((c) => c.trim().toLowerCase())

    const stages: ("Good" | "Moderate" | "Safe")[] = ["Good", "Moderate", "Safe"]
    const resultList: PreferenceResultItem[] = []

    for (const stage of stages) {
      for (const cityPref of normCities) {
        for (const branchPref of normBranches) {
          const bucket = filteredRecords.filter((rec) => {
            const stageTag = getStageTag(rec.closingPercentile)
            if (stageTag !== stage) return false

            // Branch match
            const branchMatch = rec.branchName.trim().toLowerCase() === branchPref
            if (!branchMatch) return false

            // City match
            if (cityPref === "ANY") return true
            return rec.city.trim().toLowerCase() === cityPref
          })

          // Sort bucket by closingPercentile DESC
          bucket.sort((a, b) => b.closingPercentile - a.closingPercentile)

          for (const item of bucket) {
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

    return { items: resultList }
  }
}
