import { Metadata } from "next"
import { getLatestNews } from "@/lib/news/service"
import { NewsClient } from "./news-client"
import { generateSeoMetadata } from "@/lib/seo-schemas"

export const metadata: Metadata = generateSeoMetadata({
  title: "MHT CET & NEET Admission News 2026 | CAP Round & Cutoff Updates | AdmitWise",
  description: "Get real-time admission news, official CET Cell Maharashtra notices, NEET MCC counselling updates, JEE Main JoSAA merit lists, and seat matrix releases.",
  canonicalUrl: "https://admitwiseedu.com/news",
  keywords: [
    "MHT CET Admission News",
    "CAP Round News",
    "CET Cell Maharashtra Notice",
    "NEET MCC Counselling News",
    "JEE Main JoSAA Updates",
    "Seat Matrix 2026",
    "Merit List MHT CET",
    "Vacant Seats Maharashtra",
  ],
})

export default async function NewsPage() {
  const initialData = await getLatestNews({ limit: 12, page: 1 })

  return <NewsClient initialData={initialData} />
}
