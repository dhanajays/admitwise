import { getCutoffCategory } from "@/lib/master-config"
import type {
  ChanceBand,
  CutoffRow,
  PredictionResult,
  StudentInput,
} from "./types"

function getChanceBand(score: number): ChanceBand {
  if (score >= 90) return "Very High"
  if (score >= 75) return "High"
  if (score >= 60) return "Moderate"
  if (score >= 40) return "Low"
  return "Very Low"
}

export function predict(
  input: StudentInput,
  rows: CutoffRow[]
): PredictionResult[] {
  const filtered = rows.filter((row) => {
    // ── Category must match ──────────────────────────────────────────────────
    const targetCategory = getCutoffCategory(input.category)
    if (row.category !== targetCategory) return false

    // ── Gender filter ────────────────────────────────────────────────────────
    // CSV gender is "Female" or "Not Specified" (no "Male" rows).
    // "Not Specified" seats are open to everyone.
    // "Female" seats only apply to female students.
    if (row.gender === "Female") {
      // Only include Female-reserved rows when the student is Female
      if (input.gender.toLowerCase() !== "female") return false
    }
    // row.gender === "Not Specified" → available to all genders

    // ── PwD / Disability ────────────────────────────────────────────────────
    if (input.disability) {
      // Student has disability: show only disability-quota rows
      if (row.disability.toLowerCase() !== "yes") return false
    } else {
      // Student has no disability: exclude disability-quota rows
      if (row.disability.toLowerCase() === "yes") return false
    }

    // ── Defence quota ────────────────────────────────────────────────────────
    if (input.defenseQuota) {
      if (row.defense_quota.toLowerCase() !== "yes") return false
    } else {
      if (row.defense_quota.toLowerCase() === "yes") return false
    }

    // ── CAP Stage ────────────────────────────────────────────────────────────
    // input.stage is "I" or "II", row.stage is "I" or "II"
    if (row.stage !== input.stage) return false

    // ── Preferred branches (optional filter) ─────────────────────────────────
    if (input.preferredBranches.length > 0) {
      const branchLower = row.branch_name.toLowerCase()
      const matched = input.preferredBranches.some((b) =>
        branchLower.includes(b.toLowerCase())
      )
      if (!matched) return false
    }

    return true
  })

  const results: PredictionResult[] = filtered.map((row) => {
    // Margin = student percentile minus cutoff percentile
    const margin = Number(
      (input.percentile - row.closing_percentile).toFixed(6)
    )

    let score = 50
    const reasons: string[] = []

    // ── Percentile scoring ───────────────────────────────────────────────────
    if (margin >= 5) {
      score += 40
      reasons.push("Percentile is well above the previous cutoff.")
    } else if (margin >= 2) {
      score += 30
      reasons.push("Percentile is comfortably above the previous cutoff.")
    } else if (margin >= 0.5) {
      score += 20
      reasons.push("Percentile is above the previous cutoff.")
    } else if (margin >= 0) {
      score += 10
      reasons.push("Percentile is just above the previous cutoff.")
    } else if (margin >= -1) {
      score -= 5
      reasons.push("Percentile is slightly below the previous cutoff.")
    } else if (margin >= -3) {
      score -= 20
      reasons.push("Percentile is below the previous cutoff.")
    } else {
      score -= 35
      reasons.push("Percentile is significantly below the previous cutoff.")
    }

    // ── Branch preference bonus ───────────────────────────────────────────────
    let branchMatch = false
    if (
      input.preferredBranches.length === 0 ||
      input.preferredBranches.some((b) =>
        row.branch_name.toLowerCase().includes(b.toLowerCase())
      )
    ) {
      branchMatch = true
      if (input.preferredBranches.length > 0) {
        score += 8
        reasons.push("Preferred branch matched.")
      }
    }

    // ── Home university advantage ─────────────────────────────────────────────
    let homeUniversityRelevant = false
    const seatLower = row.seat_section.toLowerCase()
    const isHomeUniversitySeat =
      seatLower.includes("home university seats allotted to home university")

    if (isHomeUniversitySeat && row.home_university === input.homeUniversity) {
      homeUniversityRelevant = true
      score += 10
      reasons.push("Home university advantage applies to this seat.")
    } else if (
      !isHomeUniversitySeat &&
      seatLower.includes("state level")
    ) {
      // State level seats: no home university restriction
      reasons.push("State level seat — open to all.")
    }

    // ── Seat section context ──────────────────────────────────────────────────
    if (
      seatLower.includes("home university seats allotted to other than home university") ||
      seatLower.includes("other than home university seats allotted to home university")
    ) {
      // Mismatch type seats — slight penalty for confusion
      score -= 3
    }

    score = Math.max(1, Math.min(99, Math.round(score)))

    const confidence = Math.max(
      55,
      Math.min(98, Math.round(70 + Math.abs(margin) * 4))
    )

    return {
      rank: 0,
      collegeCode: row.college_code,
      collegeName: row.college_name,
      branchCode: row.branch_code,
      branchName: row.branch_name,
      category: row.category,
      seatSection: row.seat_section,
      status: row.status,
      closingPercentile: row.closing_percentile,
      closingRank: row.closing_rank,
      margin,
      chance: getChanceBand(score),
      chanceScore: score,
      confidence,
      eligible: margin >= -3,
      branchMatch,
      homeUniversityRelevant,
      reasons,
      homeUniversity: row.home_university,
      instituteType: row.status,
    }
  })

  // Sort: highest chance score first, then highest closing percentile as tiebreak
  results.sort((a, b) => {
    if (b.chanceScore !== a.chanceScore) return b.chanceScore - a.chanceScore
    return b.closingPercentile - a.closingPercentile
  })

  return results.map((item, index) => ({
    ...item,
    rank: index + 1,
  }))
}

export function predictAllIndia(
  input: StudentInput,
  rows: any[] // AllIndiaCutoff rows
): PredictionResult[] {
  console.log(`\n=== All India Prediction Pipeline Starting ===`);
  console.log(`Total Cutoff Records Loaded from DB: ${rows.length}`);

  const exams = input.examsList && input.examsList.length > 0
    ? input.examsList
    : [{ exam: input.exam, percentile: input.percentile }]

  console.log(`Exams to process:`, exams);

  const matchedCollegesMap = new Map<string, PredictionResult>()

  function normalizeExamName(name: string): string {
    const clean = name.toLowerCase().replace(/[\s\(\)\-_]+/g, "");
    if (clean.includes("jee")) return "jee";
    if (clean.includes("mhtcet") || clean.includes("cet")) return "mhtcet";
    if (clean.includes("neet")) return "neet";
    return clean;
  }

  for (const { exam, percentile } of exams) {
    console.log(`\n--- Processing Exam: ${exam} (Score/Percentile: ${percentile}) ---`);
    let currentRows = [...rows];

    // Filter 1: Available For All India
    let temp = currentRows.filter(row => !row.availableForAllIndia || row.availableForAllIndia === "Yes");
    console.log(`Filter 1 (Available_For_All_India = Yes): Remaining = ${temp.length} (Eliminated ${currentRows.length - temp.length})`);
    if (temp.length === 0) {
      console.warn(`[Pipeline Error] Available_For_All_India filter eliminated all records.`);
    }
    currentRows = temp;

    // Filter 2: Merit_Exam matching
    const examNorm = normalizeExamName(exam);
    temp = currentRows.filter(row => normalizeExamName(row.meritExam) === examNorm);
    console.log(`Filter 2 (Merit_Exam = ${exam}): Remaining = ${temp.length} (Eliminated ${currentRows.length - temp.length})`);
    if (temp.length === 0) {
      console.warn(`[Pipeline Warning] Merit_Exam filter eliminated all records. Normalization target: '${examNorm}'. Sample row exams in DB:`, [...new Set(currentRows.map(r => r.meritExam))]);
    }
    currentRows = temp;

    // Filter 3: Category matching
    // All India seats: OPEN seats match all categories. Row category-specific seats match input.category.
    temp = currentRows.filter(row => row.category === "OPEN" || row.category === input.category);
    console.log(`Filter 3 (Category = ${input.category} or OPEN): Remaining = ${temp.length} (Eliminated ${currentRows.length - temp.length})`);
    if (temp.length === 0) {
      console.warn(`[Pipeline Warning] Category filter eliminated all records.`);
    }
    currentRows = temp;

    // Filter 4: Gender matching
    temp = currentRows.filter(row => {
      if (row.gender === "Female") {
        return input.gender.toLowerCase() === "female";
      }
      return true; // Any or Other matches everyone
    });
    console.log(`Filter 4 (Gender = ${input.gender}): Remaining = ${temp.length} (Eliminated ${currentRows.length - temp.length})`);
    if (temp.length === 0) {
      console.warn(`[Pipeline Warning] Gender filter eliminated all records.`);
    }
    currentRows = temp;

    // Filter 5: Home_University matching
    temp = currentRows.filter(row => {
      if (row.homeUniversity && row.homeUniversity !== "All" && row.homeUniversity !== "All India") {
        return row.homeUniversity === input.homeUniversity;
      }
      return true;
    });
    console.log(`Filter 5 (Home University = ${input.homeUniversity}): Remaining = ${temp.length} (Eliminated ${currentRows.length - temp.length})`);
    if (temp.length === 0) {
      console.warn(`[Pipeline Warning] Home_University filter eliminated all records.`);
    }
    currentRows = temp;

    // Filter 6: PwD matching (disability)
    // A PwD student is eligible for both PwD=Yes and PwD=No seats. A non-PwD student can only access PwD=No seats.
    temp = currentRows.filter(row => {
      if (input.disability) return true;
      return row.pwd !== "Yes";
    });
    console.log(`Filter 6 (PwD/Disability = ${input.disability}): Remaining = ${temp.length} (Eliminated ${currentRows.length - temp.length})`);
    if (temp.length === 0) {
      console.warn(`[Pipeline Warning] PwD filter eliminated all records.`);
    }
    currentRows = temp;

    // Filter 7: Defence matching
    // A Defence student is eligible for both Defence=Yes and Defence=No. A non-Defence student can only access Defence=No.
    temp = currentRows.filter(row => {
      if (input.defenseQuota) return true;
      return row.defense !== "Yes";
    });
    console.log(`Filter 7 (Defence = ${input.defenseQuota}): Remaining = ${temp.length} (Eliminated ${currentRows.length - temp.length})`);
    if (temp.length === 0) {
      console.warn(`[Pipeline Warning] Defence filter eliminated all records.`);
    }
    currentRows = temp;

    // Filter 8: Preferred Branches matching
    temp = currentRows.filter(row => {
      if (input.preferredBranches.length > 0) {
        const branchLower = row.courseName.toLowerCase();
        return input.preferredBranches.some((b) => branchLower.includes(b.toLowerCase()));
      }
      return true;
    });
    console.log(`Filter 8 (Preferred Branches): Remaining = ${temp.length} (Eliminated ${currentRows.length - temp.length})`);
    if (temp.length === 0) {
      console.warn(`[Pipeline Warning] Preferred Branches filter eliminated all records.`);
    }
    currentRows = temp;

    // 2. Map matches to PredictionResult
    let eligibleCount = 0;
    for (const row of currentRows) {
      const margin = Number((percentile - row.closingPercentile).toFixed(6))
      if (margin < -3) continue // Eligible margin filter (-3 percentiles/marks buffer)
      eligibleCount++;

      let score = 50
      const reasons: string[] = []

      if (margin >= 5) {
        score += 40
        reasons.push("Percentile/Score is well above the previous cutoff.")
      } else if (margin >= 2) {
        score += 30
        reasons.push("Percentile/Score is comfortably above the previous cutoff.")
      } else if (margin >= 0.5) {
        score += 20
        reasons.push("Percentile/Score is above the previous cutoff.")
      } else if (margin >= 0) {
        score += 10
        reasons.push("Percentile/Score is just above the previous cutoff.")
      } else if (margin >= -1) {
        score -= 5
        reasons.push("Percentile/Score is slightly below the previous cutoff.")
      } else if (margin >= -3) {
        score -= 20
        reasons.push("Percentile/Score is below the previous cutoff.")
      }

      const branchMatch = true
      const homeUniversityRelevant = row.homeUniversity === input.homeUniversity
      if (homeUniversityRelevant) {
        score += 5
        reasons.push("Home university match advantage.")
      }

      score = Math.max(1, Math.min(99, Math.round(score)))
      const confidence = Math.max(
        55,
        Math.min(98, Math.round(70 + Math.abs(margin) * 4))
      )

      const key = `${row.instituteCode}-${row.choiceCode}`

      const resultItem: PredictionResult = {
        rank: 0,
        collegeCode: row.instituteCode,
        collegeName: row.instituteName,
        branchCode: row.choiceCode,
        branchName: row.courseName,
        category: row.category,
        seatSection: row.seatType || "All India Seat",
        status: "Active",
        closingPercentile: row.closingPercentile,
        closingRank: row.closingAllIndiaMerit,
        margin,
        chance: getChanceBand(score),
        chanceScore: score,
        confidence,
        eligible: true,
        branchMatch,
        homeUniversityRelevant,
        reasons,
        matchedUsing: exam,
        closingAllIndiaMerit: row.closingAllIndiaMerit,
        admissionType: row.admissionType,
        seatType: row.seatType,
        homeUniversity: row.homeUniversity,
        instituteType: row.admissionType,
      }

      const existing = matchedCollegesMap.get(key)
      if (existing) {
        const matchedExams = Array.from(new Set([...(existing.matchedUsing || "").split(", "), exam]))
        existing.matchedUsing = matchedExams.join(", ")

        if (resultItem.chanceScore > existing.chanceScore) {
          existing.chanceScore = resultItem.chanceScore
          existing.chance = resultItem.chance
          existing.margin = resultItem.margin
          existing.closingPercentile = resultItem.closingPercentile
          existing.closingRank = resultItem.closingRank
          existing.closingAllIndiaMerit = resultItem.closingAllIndiaMerit
          existing.reasons = resultItem.reasons
        }
      } else {
        matchedCollegesMap.set(key, resultItem)
      }
    }
    console.log(`Matches within cutoff margin range: ${eligibleCount}`);
  }

  const resultsList = Array.from(matchedCollegesMap.values())
  console.log(`\nFinal Merged Unique College Results: ${resultsList.length}`);
  console.log(`=== All India Prediction Pipeline Ending ===\n`);

  resultsList.sort((a, b) => {
    if (b.chanceScore !== a.chanceScore) return b.chanceScore - a.chanceScore
    if (a.closingAllIndiaMerit && b.closingAllIndiaMerit) {
      return a.closingAllIndiaMerit - b.closingAllIndiaMerit
    }
    return b.closingPercentile - a.closingPercentile
  })

  return resultsList.map((item, index) => ({
    ...item,
    rank: index + 1,
  }))
}
