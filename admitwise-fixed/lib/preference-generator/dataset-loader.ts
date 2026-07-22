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

const REQUIRED_COLUMNS = [
  "college_code",
  "college_name",
  "branch_code",
  "branch_name",
  "status",
  "home_university",
  "seat_section",
  "stage",
  "category_code",
  "gender",
  "disability",
  "defense_q",
  "closing_rank",
  "closing_percentile",
  "city",
]

function normalizeCapRoundFileName(roundInput: string): string {
  const clean = roundInput.trim().toLowerCase()
  if (clean.includes("2") || clean === "2") return "CAP Round 2.csv"
  if (clean.includes("3") || clean === "3") return "CAP Round 3.csv"
  if (clean.includes("4") || clean === "4") return "CAP Round 4.csv"
  return "CAP Round 1.csv"
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
    const fileName = normalizeCapRoundFileName(roundInput)
    const roundName = fileName.replace(".csv", "")

    // Path to dataset folder: process.cwd() + "/dataset/" + fileName
    const datasetDir = path.join(process.cwd(), "dataset")
    const filePath = path.join(datasetDir, fileName)

    // Handle missing dataset file
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        records: [],
        error: `Preference List dataset for ${roundName} is not available yet. Please contact the administrator.`,
        roundName,
        fileName,
      }
    }

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8")
      if (!fileContent || fileContent.trim().length === 0) {
        return {
          success: false,
          records: [],
          error: `Preference List dataset for ${roundName} is empty.`,
          roundName,
          fileName,
        }
      }

      // Validate required columns on header line
      const firstLine = fileContent.split(/\r?\n/)[0] || ""
      const headerCols = firstLine
        .split(",")
        .map((c) => c.trim().replace(/^["']|["']$/g, "").toLowerCase())

      for (const requiredCol of REQUIRED_COLUMNS) {
        const hasCol = headerCols.some((h) => {
          const normH = h.replace(/[^a-z0-9]/g, "")
          const normReq = requiredCol.replace(/[^a-z0-9]/g, "")
          return normH === normReq || h === requiredCol
        })

        if (!hasCol) {
          return {
            success: false,
            records: [],
            error: `Missing required column: ${requiredCol} in ${fileName}`,
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

      return {
        success: true,
        records,
        roundName,
        fileName,
      }
    } catch (err: any) {
      console.error(`Error loading dataset for ${fileName}:`, err)
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
