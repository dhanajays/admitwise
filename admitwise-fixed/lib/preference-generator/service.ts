import { db } from "@/lib/db"
import type { DatasetOptions, PreferenceInput, PreferenceResultItem } from "./types"

export class PreferenceGeneratorService {
  /**
   * Fetches active dataset metadata, distinct branches (alphabetically), and distinct cities for a given CAP Round.
   */
  static async getDatasetOptions(round: string): Promise<DatasetOptions> {
    try {
      const dataset = await db.preferenceGeneratorDataset.findFirst({
        where: { round, status: "Active" },
        orderBy: { version: "desc" },
      })

      if (!dataset) {
        return {
          branches: [],
          cities: [],
          datasetInfo: null,
        }
      }

      // Fetch distinct branches and cities for this dataset
      const branchesRaw = await db.preferenceCutoff.findMany({
        where: { datasetId: dataset.id },
        distinct: ["branchName"],
        select: { branchName: true },
        orderBy: { branchName: "asc" },
      })

      const citiesRaw = await db.preferenceCutoff.findMany({
        where: { datasetId: dataset.id },
        distinct: ["city"],
        select: { city: true },
        orderBy: { city: "asc" },
      })

      return {
        branches: branchesRaw.map((b) => b.branchName).filter(Boolean),
        cities: citiesRaw.map((c) => c.city).filter(Boolean),
        datasetInfo: {
          id: dataset.id,
          round: dataset.round,
          uploadedAt: dataset.uploadedAt.toISOString(),
          rowCount: dataset.rowCount,
          version: dataset.version,
        },
      }
    } catch (error) {
      console.error("Error in PreferenceGeneratorService.getDatasetOptions:", error)
      return {
        branches: [],
        cities: [],
        datasetInfo: null,
      }
    }
  }

  /**
   * Generates the preference list following student percentile, CAP round, branch priorities, and city priorities.
   */
  static async generatePreferenceList(input: PreferenceInput): Promise<PreferenceResultItem[]> {
    const { percentile, round, preferredBranches, preferredCities } = input

    const dataset = await db.preferenceGeneratorDataset.findFirst({
      where: { round, status: "Active" },
      orderBy: { version: "desc" },
    })

    if (!dataset) {
      return []
    }

    // Step 1: Fetch cutoffs for GOPENS & LOPENS in range [30 -> 100] percentile
    const cutoffs = await db.preferenceCutoff.findMany({
      where: {
        datasetId: dataset.id,
        categoryCodeRaw: { in: ["GOPENS", "LOPENS"] },
        closingPercentile: { gte: 30, lte: 100 },
      },
    })

    if (!cutoffs || cutoffs.length === 0) {
      return []
    }

    // Step 2: For each college_code + branch_code, keep GOPENS first. Fallback to LOPENS if no GOPENS exists.
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

    // Determine Stage for a cutoff
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

    // Filter records into stages and index maps
    const stages: ("Good" | "Moderate" | "Safe")[] = ["Good", "Moderate", "Safe"]
    const resultList: PreferenceResultItem[] = []

    for (const stage of stages) {
      for (const cityPref of normCities) {
        for (const branchPref of normBranches) {
          // Filter matching records for this Stage + City + Branch combination
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

    return resultList
  }
}
