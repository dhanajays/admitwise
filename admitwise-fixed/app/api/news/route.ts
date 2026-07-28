import { NextResponse } from "next/server"
import { getLatestNews, getBreakingNews } from "@/lib/news/service"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const breakingOnly = searchParams.get("breaking") === "true"

    if (breakingOnly) {
      const items = await getBreakingNews()
      return NextResponse.json({ success: true, articles: items })
    }

    const category = searchParams.get("category") || undefined
    const search = searchParams.get("q") || searchParams.get("search") || undefined
    const source = searchParams.get("source") || undefined
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "12", 10)

    const result = await getLatestNews({
      category,
      search,
      source,
      page,
      limit,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error("Error in GET /api/news:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch news articles" },
      { status: 500 }
    )
  }
}
