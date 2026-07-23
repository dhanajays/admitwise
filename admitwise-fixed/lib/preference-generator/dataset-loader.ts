import fs from "fs"
import path from "path"
import Papa from "papaparse"

export interface PreferenceDatasetRow {
  id: string
  collegeCode: string
  collegeName: string
  branchCode: string
  branchName: string
  status: string
  homeUniversity: string
  seatSection: string
  stage: string
  categoryCodeRaw: string
  gender: string
  disability: string
  defenseQuota: string
  closingRank: number
  closingPercentile: number
  city: string
}

const COLUMN_ALIASES: Record<string, string[]> = {
  college_code: ["college_code", "collegecode"],
  college_name: ["college_name", "collegename"],
  branch_code: ["branch_code", "branchcode"],
  branch_name: ["branch_name", "branchname"],
  status: ["status"],
  home_university: ["home_university", "homeuniversity"],
  seat_section: ["seat_section", "seatsection"],
  stage: ["stage"],
  category_code: ["category_code_raw", "category_code", "categorycode", "category"],
  gender: ["gender"],
  disability: ["disability"],
  defense_q: ["defense_quota", "defense_q", "defenseq"],
  closing_rank: ["closing_rank", "closingrank"],
  closing_percentile: ["closing_percentile", "closingpercentile"],
  city: ["city"],
}

/**
 * Central Preference List Dataset Resolver
 * Dynamically resolves the exact CSV path inside project_root/dataset/ based on the selected CAP Round.
 */
export function resolvePreferenceDatasetPath(roundInput: string): {
  roundName: string
  fileName: string
  filePath: string
  roundNumber: number
} {
  const clean = roundInput.trim().toLowerCase()
  let roundNumber = 1

  if (clean.includes("2") || clean === "2") {
    roundNumber = 2
  } else if (clean.includes("3") || clean === "3") {
    roundNumber = 3
  } else if (clean.includes("4") || clean === "4") {
    roundNumber = 4
  } else {
    roundNumber = 1
  }

  const fileName = `CAP Round ${roundNumber}.csv`
  const roundName = `CAP Round ${roundNumber}`
  const filePath = path.join(process.cwd(), "dataset", fileName)

  return { roundName, fileName, filePath, roundNumber }
}

export class PreferenceDatasetLoader {
  /**
   * Loads and parses the Preference List dataset directly from the /dataset folder for the specified round.
   */
  static loadDatasetForRound(roundInput: string): {
    success: boolean
    records: PreferenceDatasetRow[]
    error?: string
    roundName: string
    fileName: string
  } {
    const { roundName, fileName, filePath, roundNumber } = resolvePreferenceDatasetPath(roundInput)
    const fileExists = fs.existsSync(filePath)

    console.log(`\n=======================================================`)
    console.log(`[PreferenceDatasetLoader] Loading dataset attempt:`)
    console.log(`- Selected CAP Round: ${roundInput} (${roundName})`)
    console.log(`- Target Dataset Path: ${filePath}`)
    console.log(`- File Exists: ${fileExists ? "Yes" : "No"}`)

    // Handle missing dataset file
    if (!fileExists) {
      const errorMsg = `CAP Round ${roundNumber} dataset has not been uploaded yet.`
      console.warn(`- Status: Failed - ${errorMsg}`)
      console.log(`=======================================================\n`)
      return {
        success: false,
        records: [],
        error: errorMsg,
        roundName,
        fileName,
      }
    }

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8")
      if (!fileContent || fileContent.trim().length === 0) {
        const errorMsg = `CAP Round ${roundNumber} dataset file is empty.`
        console.warn(`- Status: Failed - ${errorMsg}`)
        console.log(`=======================================================\n`)
        return {
          success: false,
          records: [],
          error: errorMsg,
          roundName,
          fileName,
        }
      }

      // Validate required columns on header line using flexible aliases
      const firstLine = fileContent.split(/\r?\n/)[0] || ""
      const headerCols = firstLine
        .split(",")
        .map((c) => c.trim().replace(/^["']|["']$/g, "").toLowerCase())

      for (const [canonicalName, aliases] of Object.entries(COLUMN_ALIASES)) {
        const hasCol = headerCols.some((h) => {
          const normH = h.replace(/[^a-z0-9]/g, "")
          return aliases.some((alias) => {
            const normAlias = alias.replace(/[^a-z0-9]/g, "")
            return normH === normAlias || h === alias
          })
        })

        if (!hasCol) {
          const errorMsg = `Missing required column: ${canonicalName} in ${fileName}`
          console.error(`- Status: Failed - ${errorMsg}`)
          console.log(`=======================================================\n`)
          return {
            success: false,
            records: [],
            error: errorMsg,
            roundName,
            fileName,
          }
        }
      }

      // Parse CSV using Papaparse
      const parsed = Papa.parse<any>(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase(),
      })

      if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
        console.error(`- CSV Parsing Status: Failed - ${parsed.errors.length} errors`)
        console.log(`=======================================================\n`)
        return {
          success: false,
          records: [],
          error: `CSV parsing error in ${fileName}`,
          roundName,
          fileName,
        }
      }

      const records: PreferenceDatasetRow[] = []
      for (let idx = 0; idx < parsed.data.length; idx++) {
        const row = parsed.data[idx]
        const collegeCode = String(row.college_code || row.collegecode || "").trim()
        const collegeName = String(row.college_name || row.collegename || "").trim()
        const branchCode = String(row.branch_code || row.branchcode || "").trim()
        const branchName = String(row.branch_name || row.branchname || "").trim()
        const status = String(row.status || "").trim()
        const homeUniversity = String(row.home_university || row.homeuniversity || "").trim()
        const seatSection = String(row.seat_section || row.seatsection || "").trim()
        const stage = String(row.stage || "").trim()
        const categoryCodeRaw = String(
          row.category_code_raw || row.category_code || row.categorycode || row.category || ""
        ).trim()
        const gender = String(row.gender || "").trim()
        const disability = String(row.disability || "No").trim()
        const defenseQuota = String(
          row.defense_quota || row.defense_q || row.defenseq || "No"
        ).trim()
        const closingRank = parseInt(row.closing_rank || row.closingrank || "0", 10)
        const closingPercentile = parseFloat(row.closing_percentile || row.closingpercentile || "0")
        const city = String(row.city || "").trim()

        if (!collegeName || !branchName || isNaN(closingPercentile)) {
          continue
        }

        records.push({
          id: `pref_${idx}_${collegeCode}_${branchCode}`,
          collegeCode,
          collegeName,
          branchCode,
          branchName,
          status,
          homeUniversity,
          seatSection,
          stage,
          categoryCodeRaw,
          gender,
          disability,
          defenseQuota,
          closingRank: isNaN(closingRank) ? 0 : closingRank,
          closingPercentile,
          city,
        })
      }

      console.log(`- CSV Parsing Status: Success`)
      console.log(`- Number of rows loaded: ${records.length}`)
      console.log(`=======================================================\n`)

      return {
        success: true,
        records,
        roundName,
        fileName,
      }
    } catch (err: any) {
      console.error(`- CSV Parsing Status: Fatal Error`)
      console.error(`- Full error stack:`, err.stack || err)
      console.log(`=======================================================\n`)
      return {
        success: false,
        records: [],
        error: `Failed to load ${fileName}: ${err.message}`,
        roundName,
        fileName,
      }
    }
  }
}
