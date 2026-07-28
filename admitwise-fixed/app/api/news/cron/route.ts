import { NextResponse } from "next/server"
import { syncLatestNews } from "@/lib/news/service"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // 60 seconds max duration for serverless execution

export async function GET(req: Request) {
  try {
    // Verify Vercel Cron secret or token if provided
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const url = new URL(req.url)
      const token = url.searchParams.get("token")
      if (token !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 })
      }
    }

    console.log("[Vercel Cron] Executing 15-minute admission news sync...")
    const res = await syncLatestNews()
    console.log(`[Vercel Cron] Synced ${res.count} admission news articles to PostgreSQL!`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      synced: res.count,
      message: "Admission news background sync executed successfully",
    })
  } catch (error: any) {
    console.error("[Vercel Cron Error]:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return GET(req)
}
