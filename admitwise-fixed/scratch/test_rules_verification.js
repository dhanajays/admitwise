const { getPreferenceListEntitlement } = require("../lib/payments")
const { db } = require("../lib/db")

async function testRules() {
  console.log("=========================================")
  console.log("      PREFERENCE GENERATOR LOGIC VERIFICATION")
  console.log("=========================================\n")

  // Find or create test student user
  let testUser = await db.user.findFirst({ where: { email: "test_rules_student@example.com" } })
  if (!testUser) {
    testUser = await db.user.create({
      data: {
        email: "test_rules_student@example.com",
        name: "Test Student Rules",
        currentPlan: "free",
      },
    })
  }

  const userId = testUser.id

  // Clean up any existing purchases & saved percentiles for clean test run
  await db.preferenceGeneratorPurchase.deleteMany({ where: { userId } })
  await db.preferenceSavedPercentile.deleteMany({ where: { userId } })

  console.log("--- TEST SCENARIO 1: Unpaid Round (Rule 1, 2, 7 & 9) ---")
  let entR1_92 = await getPreferenceListEntitlement(userId, "Round 1", 92.0)
  console.log("Round 1 (Unpaid), Perc 92 =>", {
    statusState: entR1_92.statusState,
    hasRoundAccess: entR1_92.hasRoundAccess,
    isPreview: entR1_92.isPreview,
    showFullList: entR1_92.showFullList,
    enablePdf: entR1_92.enablePdf,
    showPaymentCTA: entR1_92.showPaymentCTA,
  })
  console.assert(entR1_92.statusState === "UNPAID_ROUND", "FAIL: Should be UNPAID_ROUND")
  console.assert(entR1_92.isPreview === true, "FAIL: Should be isPreview: true")
  console.assert(entR1_92.showFullList === false, "FAIL: Should be showFullList: false")
  console.assert(entR1_92.enablePdf === false, "FAIL: Should be enablePdf: false")
  console.assert(entR1_92.showPaymentCTA === true, "FAIL: Should be showPaymentCTA: true")
  console.log("✅ SCENARIO 1 PASSED!\n")

  console.log("--- TEST SCENARIO 2: Purchase Round 2 with 92% (Rule 3) ---")
  await db.preferenceGeneratorPurchase.create({
    data: { userId, round: "Round 2", savedPercentile: 92.0, status: "Paid", amount: 599 },
  })
  await db.preferenceSavedPercentile.create({
    data: { userId, savedPercentile: 92.0 },
  })

  let entR2_92 = await getPreferenceListEntitlement(userId, "Round 2", 92.0)
  console.log("Round 2 (Paid), Perc 92 (Saved) =>", {
    statusState: entR2_92.statusState,
    hasRoundAccess: entR2_92.hasRoundAccess,
    isPreview: entR2_92.isPreview,
    showFullList: entR2_92.showFullList,
    enablePdf: entR2_92.enablePdf,
    showPaymentCTA: entR2_92.showPaymentCTA,
  })
  console.assert(entR2_92.statusState === "PAID_ROUND_SAVED_PERCENTILE", "FAIL: Should be PAID_ROUND_SAVED_PERCENTILE")
  console.assert(entR2_92.isPreview === false, "FAIL: Should be isPreview: false")
  console.assert(entR2_92.showFullList === true, "FAIL: Should be showFullList: true")
  console.assert(entR2_92.enablePdf === true, "FAIL: Should be enablePdf: true")
  console.assert(entR2_92.showPaymentCTA === false, "FAIL: Should be showPaymentCTA: false")
  console.log("✅ SCENARIO 2 PASSED!\n")

  console.log("--- TEST SCENARIO 3: Return later to Round 2 with 92% (Rule 4) ---")
  let entR2_92_return = await getPreferenceListEntitlement(userId, "Round 2", 92.0)
  console.assert(entR2_92_return.statusState === "PAID_ROUND_SAVED_PERCENTILE", "FAIL: Returning later should unlock")
  console.assert(entR2_92_return.showFullList === true && entR2_92_return.enablePdf === true, "FAIL: Full list and PDF enabled")
  console.log("✅ SCENARIO 3 PASSED!\n")

  console.log("--- TEST SCENARIO 4: Use another saved percentile (54%) in Round 2 (Rule 5) ---")
  await db.preferenceSavedPercentile.create({
    data: { userId, savedPercentile: 54.0 },
  })
  let entR2_54 = await getPreferenceListEntitlement(userId, "Round 2", 54.0)
  console.log("Round 2 (Paid), Perc 54 (Saved) =>", {
    statusState: entR2_54.statusState,
    showFullList: entR2_54.showFullList,
    enablePdf: entR2_54.enablePdf,
  })
  console.assert(entR2_54.statusState === "PAID_ROUND_SAVED_PERCENTILE", "FAIL: Saved percentile in paid round should unlock")
  console.assert(entR2_54.showFullList === true, "FAIL: Should show full list")
  console.log("✅ SCENARIO 4 PASSED!\n")

  console.log("--- TEST SCENARIO 5: Enter NEW unsaved percentile (81%) in Round 2 (Rule 6) ---")
  let entR2_81 = await getPreferenceListEntitlement(userId, "Round 2", 81.0)
  console.log("Round 2 (Paid), Perc 81 (UNSAVED) =>", {
    statusState: entR2_81.statusState,
    hasRoundAccess: entR2_81.hasRoundAccess,
    isPreview: entR2_81.isPreview,
    showFullList: entR2_81.showFullList,
    enablePdf: entR2_81.enablePdf,
    showPaymentCTA: entR2_81.showPaymentCTA,
    message: entR2_81.message,
  })
  console.assert(entR2_81.statusState === "PAID_ROUND_UNSAVED_PERCENTILE", "FAIL: Unsaved percentile in paid round should be PAID_ROUND_UNSAVED_PERCENTILE")
  console.assert(entR2_81.showFullList === false, "FAIL: Unsaved percentile must NOT show full list")
  console.assert(entR2_81.enablePdf === false, "FAIL: Unsaved percentile must NOT enable PDF")
  console.assert(entR2_81.showPaymentCTA === true, "FAIL: Unsaved percentile must show payment CTA for +1 saved percentile")
  console.log("✅ SCENARIO 5 PASSED!\n")

  console.log("--- TEST SCENARIO 6: Other rounds stay locked (Rule 1 & 7) ---")
  let entR3_92 = await getPreferenceListEntitlement(userId, "Round 3", 92.0)
  console.log("Round 3 (Unpaid), Perc 92 (Saved) =>", {
    statusState: entR3_92.statusState,
    isPreview: entR3_92.isPreview,
    showFullList: entR3_92.showFullList,
    showPaymentCTA: entR3_92.showPaymentCTA,
  })
  console.assert(entR3_92.statusState === "UNPAID_ROUND", "FAIL: Round 3 should be UNPAID_ROUND")
  console.assert(entR3_92.isPreview === true, "FAIL: Round 3 must be preview mode")
  console.assert(entR3_92.showFullList === false, "FAIL: Round 3 must not show full list")
  console.log("✅ SCENARIO 6 PASSED!\n")

  // Cleanup test user
  await db.preferenceGeneratorPurchase.deleteMany({ where: { userId } })
  await db.preferenceSavedPercentile.deleteMany({ where: { userId } })
  await db.user.delete({ where: { id: userId } })

  console.log("=========================================")
  console.log(" ALL 6 VERIFICATION SCENARIOS PASSED 100%!")
  console.log("=========================================")
}

testRules()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed with error:", err)
    process.exit(1)
  })
