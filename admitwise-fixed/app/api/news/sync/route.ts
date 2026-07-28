import { NextResponse } from "next/server"
import { syncLatestNews } from "@/lib/news/service"

export async function GET() {
  try {
    const res = await syncLatestNews()
    return NextResponse.json({ success: true, synced: res.count })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const res = await syncLatestNews()
    return NextResponse.json({ success: true, synced: res.count })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
