import { NextResponse } from "next/server"
import { PreferenceGeneratorService } from "@/lib/preference-generator/service"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const round = searchParams.get("round") || "Round 1"

    console.log(`\n-------------------------------------------------------`)
    console.log(`[API GET /api/preference-generator/dataset] Target Round: "${round}"`)
    const options = await PreferenceGeneratorService.getDatasetOptions(round)

    console.log(`[API GET /api/preference-generator/dataset] Response Summary:`)
    console.log(`- Status: ${options.error ? "Failed" : "Success"}`)
    console.log(`- Total Unique Branches: ${options.branches ? options.branches.length : 0}`)
    console.log(`- Total Unique Cities: ${options.cities ? options.cities.length : 0}`)
    if (options.branches && options.branches.length > 0) {
      console.log(`- Sample Branches (First 5):`, options.branches.slice(0, 5))
    }
    if (options.error) {
      console.warn(`- Returned Error Message:`, options.error)
    }
    console.log(`-------------------------------------------------------\n`)

    return NextResponse.json(options)
  } catch (error: any) {
    console.error("Error in /api/preference-generator/dataset GET:", error?.stack || error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
