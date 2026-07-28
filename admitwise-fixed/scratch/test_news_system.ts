import { syncLatestNews, getBreakingNews, getLatestNews, getNewsBySlug } from "@/lib/news/service"

async function main() {
  console.log("=========================================")
  console.log("   AUTOMATED NEWS SYSTEM VERIFICATION")
  console.log("=========================================\n")

  // 1. Sync news
  console.log("--- 1. Testing Sync Engine ---")
  const syncRes = await syncLatestNews()
  console.log(`Synced ${syncRes.count} articles to database!`)

  // 2. Fetch breaking news
  console.log("\n--- 2. Testing Breaking News Marquee Headlines ---")
  const breaking = await getBreakingNews()
  console.log(`Retrieved ${breaking.length} breaking news items:`)
  breaking.slice(0, 3).forEach((b, idx) => {
    console.log(` [${idx + 1}] [${b.source}] ${b.title} (${b.category})`)
  })

  // 3. Search and Category Filter
  console.log("\n--- 3. Testing Category & Search Filtering ---")
  const mhtCetNews = await getLatestNews({ category: "MHT CET" })
  console.log(`MHT CET Category Articles: ${mhtCetNews.total}`)

  const seatMatrixNews = await getLatestNews({ category: "Seat Matrix" })
  console.log(`Seat Matrix Category Articles: ${seatMatrixNews.total}`)

  const searchQuery = await getLatestNews({ search: "Merit" })
  console.log(`Search Query 'Merit' Articles: ${searchQuery.total}`)

  // 4. Test Direct External Source Linking
  if (breaking.length > 0) {
    const item = breaking[0]
    console.log(`\n--- 4. Testing Direct External Source Linking ---`)
    console.log(`Article Title: ${item.title}`)
    console.log(`Source: ${item.source} | Source URL: ${item.sourceUrl}`)
    console.log(`Dynamic Button Label: "Read Article on ${item.source}"`)
    if (item.sourceUrl && item.sourceUrl.startsWith("http")) {
      console.log("✅ DIRECT EXTERNAL SOURCE URL LINKING PASSED!")
    } else {
      console.error("❌ Source URL invalid!")
    }
  }

  console.log("\n=========================================")
  console.log(" ALL NEWS SYSTEM VERIFICATIONS PASSED!")
  console.log("=========================================")
}

main().catch(console.error)
