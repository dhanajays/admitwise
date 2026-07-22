import { NextResponse } from "next/server"
import { PreferenceGeneratorService } from "@/lib/preference-generator/service"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const round = searchParams.get("round") || "Round 1"

    const options = await PreferenceGeneratorService.getDatasetOptions(round)
    return NextResponse.json(options)
  } catch (error) {
    console.error("Error in /api/preference-generator/dataset GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
