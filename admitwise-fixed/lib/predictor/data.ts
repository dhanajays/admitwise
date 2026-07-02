import "server-only"
import { promises as fs } from "fs"
import path from "path"
import type { CutoffRow } from "./types"

import { db } from "@/lib/db"

let cache: Record<string, CutoffRow[]> = {}

/**
 * Parses a CSV line respecting quoted fields that may contain commas.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export async function loadCutoffs(stage: string = "I", exam: string = "MHT CET PCM"): Promise<CutoffRow[]> {
  const normStage = ["I", "II", "III", "IV"].includes(stage) ? stage : "I"
  const cacheKey = `${normStage}_${exam}`
  if (cache[cacheKey]) return cache[cacheKey]

  // 1. Try to load from Database first
  try {
    const dbRound = normStage === "I" ? "Round 1" : normStage === "II" ? "Round 2" : normStage === "III" ? "Round 3" : "Round 4"
    const dbCutoffs = await db.cutoff.findMany({
      where: {
        dataset: {
          status: "Active",
          round: dbRound,
          exam: exam,
        },
      },
      include: {
        dataset: true,
      },
    })

    if (dbCutoffs && dbCutoffs.length > 0) {
      console.log(`🚀 Loaded ${dbCutoffs.length} cutoffs dynamically from PostgreSQL database for ${dbRound} (${exam}).`)
      const rows: CutoffRow[] = dbCutoffs.map((c) => ({
        exam: c.dataset.exam || "MHT CET PCM",
        college_code: c.collegeCode,
        college_name: c.collegeName,
        branch_code: c.branchCode,
        branch_name: c.branchName,
        status: c.status,
        home_university: c.homeUniversity,
        seat_section: c.seatSection,
        stage: normStage,
        category_code_raw: c.categoryCodeRaw,
        category: c.category,
        gender: c.gender,
        disability: c.disability,
        defense_quota: c.defenseQuota,
        closing_rank: c.closingRank,
        closing_percentile: c.closingPercentile,
      }))
      cache[cacheKey] = rows.filter(
        (r) => r.college_code && r.branch_name && r.category
      )
      return cache[cacheKey]
    }
  } catch (error) {
    console.error(`⚠️ Failed to load cutoffs from database for stage ${normStage} (${exam}). Falling back to CSV.`, error)
  }

  // 2. CSV Fallback
  const csvFileName = normStage === "I" ? "CAP Round 1.csv" : normStage === "II" ? "CAP Round 2.csv" : normStage === "III" ? "CAP Round 3.csv" : "CAP Round 4.csv"
  let filePath = path.join(process.cwd(), "data", csvFileName)
  let raw: string
  try {
    raw = await fs.readFile(filePath, "utf8")
  } catch (err: any) {
    if (normStage === "I" && err.code === "ENOENT") {
      filePath = path.join(process.cwd(), "data", "cutoffs.csv")
      raw = await fs.readFile(filePath, "utf8")
    } else {
      throw err;
    }
  }

  const lines = raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)

  const headers = parseCsvLine(lines[0])

  const rows: CutoffRow[] = lines.slice(1).map((line) => {
    const values = parseCsvLine(line)

    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = (values[index] ?? "").trim()
    })

    return {
      // The CSV has no exam column — default to MHT CET PCM
      exam: "MHT CET PCM",

      college_code: record.college_code ?? "",
      college_name: record.college_name ?? "",

      branch_code: record.branch_code ?? "",
      branch_name: record.branch_name ?? "",

      status: record.status ?? "",
      home_university: record.home_university ?? "",
      seat_section: record.seat_section ?? "",

      // Override stage with the requested normStage so it filters properly in the engine
      stage: normStage,

      category_code_raw: record.category_code_raw ?? "",
      category: record.category ?? "",

      // CSV values: "Female" | "Not Specified"
      gender: record.gender ?? "Not Specified",

      disability: record.disability ?? "No",
      defense_quota: record.defense_quota ?? "No",

      closing_rank: Number(record.closing_rank) || 0,
      closing_percentile: Number(record.closing_percentile) || 0,
    }
  })

  cache[cacheKey] = rows.filter(
    (r) => r.college_code && r.branch_name && r.category
  )

  return cache[cacheKey]
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
    .map((v) => v.trim())
    .filter(Boolean)
    .sort()
}

import { STANDARDIZED_BRANCHES, CATEGORIES } from "@/lib/master-config"

export async function getFilterOptions() {
  const rows = await loadCutoffs("I")

  // Home universities: exclude non-university values (seat section strings, etc.)
  const universities = unique(
    rows
      .map((r) => r.home_university)
      .filter((u) => {
        if (!u) return false
        if (u.toLowerCase().includes("seat")) return false
        return true
      })
  )

  const exams = unique(rows.map((r) => r.exam).filter(Boolean))

  // Stages present in the dataset (CAP Round I, II, III, IV)
  const stages = ["I", "II", "III", "IV"]

  return {
    exams,
    categories: CATEGORIES,
    branches: STANDARDIZED_BRANCHES,
    universities,
    stages,
  }
}

export function clearCutoffsCache(): void {
  cache = {}
}
