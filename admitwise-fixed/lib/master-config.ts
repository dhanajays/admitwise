/**
 * Shared Master Configuration for AdmitWise Predictor and Tracker modules
 */

export const EXAMS = ["MHT CET PCM"]

// Unified list of categories
export const CATEGORIES = [
  "OPEN",
  "OBC",
  "SC",
  "ST",
  "VJ/DT",
  "NT-B",
  "NT-C",
  "NT-D",
  "SEBC",
  "EWS",
  "ORPHAN",
  "TFWS",
]

// Map student category values to cutoff dataset values if they differ (e.g. VJ/DT is NT-A in cutoffs)
export function getCutoffCategory(studentCategory: string): string {
  const cat = studentCategory.toUpperCase()
  if (cat === "VJ/DT" || cat === "VJDT" || cat === "VJ-DT") {
    return "NT-A"
  }
  return studentCategory
}

// Unified list of CAP Rounds
export const CAP_ROUNDS = [
  { id: "Round 1", label: "CAP Round I", stage: "I" },
  { id: "Round 2", label: "CAP Round II", stage: "II" },
  { id: "Round 3", label: "CAP Round III", stage: "III" },
  { id: "Round 4", label: "CAP Round IV", stage: "IV" },
]

const RAW_BRANCHES = [
  "Aeronautical Engineering",
  "Agricultural Engineering",
  "Artificial Intelligence",
  "Artificial Intelligence (AI) and Data Science",
  "Artificial Intelligence and Data Science",
  "Artificial Intelligence and Machine Learning",
  "Automation and Robotics",
  "Automobile Engineering",
  "Bio Medical Engineering",
  "Bio Technology",
  "Chemical Engineering",
  "Civil Engineering",
  "Civil Engineering (Structural Engineering)",
  "Civil Engineering and Planning",
  "Civil Engineering with Computer Application",
  "Civil and Environmental Engineering",
  "Civil and Infrastructure Engineering",
  "Computer Engineering",
  "Computer Engineering (Regional Language)",
  "Computer Engineering (Software Engineering)",
  "Computer Science",
  "Computer Science and Business Systems",
  "Computer Science and Design",
  "Computer Science and Engineering",
  "Computer Science and Engineering (Artificial Intelligence and Data Science)",
  "Computer Science and Engineering (Artificial Intelligence)",
  "Computer Science and Engineering (Cyber Security)",
  "Computer Science and Engineering (Internet of Things and Cyber Security Including Block Chain)",
  "Computer Science and Engineering (IoT)",
  "Computer Science and Engineering (Artificial Intelligence and Machine Learning)",
  "Computer Science and Engineering (Cyber Security)",
  "Computer Science and Engineering (Data Science)",
  "Computer Science and Information Technology",
  "Computer Science and Technology",
  "Computer Technology",
  "Cyber Security",
  "Data Science",
  "Dyestuff Technology",
  "Electronics and Communication Engineering (Bio-Medical Engineering)",
  "Electrical Engineering (Electronics and Power)",
  "Electrical Engineering",
  "Electrical and Computer Engineering",
  "Electrical and Electronics Engineering",
  "Electrical, Electronics and Power",
  "Electronics & Telecommunication Engineering",
  "Electronics Engineering",
  "Electronics Engineering (VLSI Design and Technology)",
  "Electronics and Biomedical Engineering",
  "Electronics and Communication (Advanced Communication Technology)",
  "Electronics and Communication Engineering",
  "Electronics and Computer Engineering",
  "Electronics and Computer Science",
  "Electronics and Telecommunication Engineering",
  "Fashion Technology",
  "Fibres and Textile Processing Technology",
  "Food Engineering",
  "Food Engineering and Technology",
  "Food Technology",
  "Food Technology and Management",
  "Industrial IoT",
  "Information Technology",
  "Instrumentation Engineering",
  "Instrumentation and Control Engineering",
  "Internet of Things (IoT)",
  "Mechanical and Rail Engineering",
  "Man Made Textile Technology",
  "Manufacturing Science and Engineering",
  "Mechanical & Automation Engineering",
  "Mechanical Engineering",
  "Mechanical Engineering Automobile",
  "Mechanical Engineering (Sandwich)",
  "Mechanical and Mechatronics Engineering (Additive Manufacturing)",
  "Mechatronics Engineering",
  "Metallurgy and Material Technology",
  "Mining Engineering",
  "Oil Fats and Waxes Technology",
  "Oil Technology",
  "Oil and Paints Technology",
  "Oil, Oleochemicals and Surfactants Technology",
  "Paints Technology",
  "Paper and Pulp Technology",
  "Petro Chemical Engineering",
  "Pharmaceutical and Fine Chemical Technology",
  "Pharmaceuticals Chemistry and Technology",
  "Plastic Technology",
  "Plastic and Polymer Engineering",
  "Polymer Engineering and Technology",
  "Printing and Packing Technology",
  "Production Engineering",
  "Production Engineering (Sandwich)",
  "Robotics and Artificial Intelligence",
  "Robotics and Automation",
  "Safety and Fire Engineering",
  "Structural Engineering",
  "Surface Coating Technology",
  "Technical Textiles",
  "Textile Chemistry",
  "Textile Engineering / Technology",
  "Textile Technology",
  "VLSI"
]

export const STANDARDIZED_BRANCHES = Array.from(
  new Map(
    RAW_BRANCHES.map((name) => {
      const trimmed = name.trim().replace(/\s+/g, " ")
      const id = trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
      return [id, { id, name: trimmed }]
    })
  ).values()
)

// Lookup configuration mapping each (Category + Gender) combination to its corresponding column name in prisma model
export const SEAT_COLUMN_LOOKUP: Record<string, string> = {
  "OPEN_MALE": "openG",
  "OPEN_FEMALE": "openL",
  "OBC_MALE": "obcG",
  "OBC_FEMALE": "obcL",
  "SC_MALE": "scG",
  "SC_FEMALE": "scL",
  "ST_MALE": "stG",
  "ST_FEMALE": "stL",
  "VJ/DT_MALE": "vjdtG",
  "VJ/DT_FEMALE": "vjdtL",
  "NT-B_MALE": "ntbG",
  "NT-B_FEMALE": "ntbL",
  "NT-C_MALE": "ntcG",
  "NT-C_FEMALE": "ntcL",
  "NT-D_MALE": "ntdG",
  "NT-D_FEMALE": "ntdL",
  "SEBC_MALE": "sebcG",
  "SEBC_FEMALE": "sebcL",
  // Gender independent categories
  "EWS": "ewsSeats",
  "ORPHAN": "orphanSeats",
  "TFWS": "tfwsSeats",
}

// Reusable function to get seat column name from Category + Gender
export function getVacantSeatColumn(category: string, gender: string): string {
  const catUpper = category.toUpperCase()
  if (["EWS", "ORPHAN", "TFWS"].includes(catUpper)) {
    return SEAT_COLUMN_LOOKUP[catUpper]
  }

  let normalizedCategory = catUpper
  if (catUpper === "VJDT" || catUpper === "VJ-DT") {
    normalizedCategory = "VJ/DT"
  }

  const key = `${normalizedCategory}_${gender.toUpperCase()}`
  return SEAT_COLUMN_LOOKUP[key] || "openG"
}

// Map database column names to user-facing CSV header / display labels
export const DB_COLUMN_TO_HEADER: Record<string, string> = {
  openG: "OPEN_G",
  openL: "OPEN_L",
  scG: "SC_G",
  scL: "SC_L",
  stG: "ST_G",
  stL: "ST_L",
  vjdtG: "VJDT_G",
  vjdtL: "VJDT_L",
  ntbG: "NTB_G",
  ntbL: "NTB_L",
  ntcG: "NTC_G",
  ntcL: "NTC_L",
  ntdG: "NTD_G",
  ntdL: "NTD_L",
  obcG: "OBC_G",
  obcL: "OBC_L",
  sebcG: "SEBC_G",
  sebcL: "SEBC_L",
  pwdCommon: "PWD_Common",
  defCommon: "DEF_Common",
  ewsSeats: "EWS_Seats",
  tfwsSeats: "TFWS_Seats",
  orphanSeats: "Orphan_Seats",
}
