import { syncLatestNews } from "../lib/news/service"

async function runNewsSync() {
  console.log("=========================================")
  console.log("  MANUAL ADMISSION NEWS SYNC (CLI)")
  console.log("=========================================\n")

  const startTime = Date.now()
  try {
    console.log("Fetching latest news from all configured sources...")
    const result = await syncLatestNews()
    const elapsed = Date.now() - startTime

    console.log(`\n✅ News sync completed successfully in ${elapsed}ms.`)
    console.log(`Synced/Updated Articles: ${result.count}`)
    console.log("PostgreSQL database updated with latest admission news.")
    process.exit(0)
  } catch (error) {
    console.error("❌ News sync failed:", error)
    process.exit(1)
  }
}

runNewsSync()
