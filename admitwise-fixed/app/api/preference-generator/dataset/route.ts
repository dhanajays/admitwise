import { NextResponse } from "next/server"
import { PreferenceGeneratorService } from "@/lib/preference-generator/service"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const round = searchParams.get("round") || "Round 1"

    console.log("========== DATASET REQUEST ==========")
    console.log("URL:", req.url)
    console.log("Selected Round:", round)
    console.log("process.cwd():", process.cwd())

    const options = await PreferenceGeneratorService.getDatasetOptions(round)

    console.log("========== DATASET RESPONSE ==========")
    console.log("Branches extracted count:", options.branches ? options.branches.length : 0)
    console.log("Cities extracted count:", options.cities ? options.cities.length : 0)
    if (options.branches && options.branches.length > 0) {
      console.log("Sample Branches (First 5):", options.branches.slice(0, 5))
    }
    if (options.error) {
      console.warn("Response contains error:", options.error)
    }

    return NextResponse.json(options)
  } catch (error: any) {
    console.error("Error in /api/preference-generator/dataset GET:", error?.stack || error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
