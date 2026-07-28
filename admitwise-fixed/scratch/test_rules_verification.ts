import { getPreferenceListEntitlement } from "../lib/payments"
import { db } from "../lib/db"

async function testRules() {
  console.log("=========================================")
  console.log("   ALL ROUNDS & PLANS VERIFICATION")
  console.log("=========================================\n")

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

  await db.preferenceGeneratorPurchase.deleteMany({ where: { userId } })
  await db.preferenceSavedPercentile.deleteMany({ where: { userId } })

  console.log("--- PART 1: Standard ₹599 Plan Verification ---")
  console.log("--- TEST SCENARIO 1: Unpaid Round 1, Round 2, Round 3, Round 4 (Preview Mode) ---")
  for (const round of ["Round 1", "Round 2", "Round 3", "Round 4"]) {
    let ent = await getPreferenceListEntitlement(userId, round, 92.0)
    console.log(`${round} (Unpaid), Perc 92 =>`, { mode: ent.mode, enablePdf: ent.enablePdf })
    if (ent.mode !== "preview" || ent.enablePdf !== false) {
      throw new Error(`SCENARIO 1 FAILED for ${round}`)
    }
  }
  console.log("✅ SCENARIO 1 PASSED!\n")

  console.log("--- TEST SCENARIO 2: Purchase Round 2 with 92% (Full Mode) ---")
  await db.preferenceGeneratorPurchase.create({
    data: { userId, round: "Round 2", savedPercentile: 92.0, status: "Paid", amount: 599 },
  })
  await db.preferenceSavedPercentile.create({
    data: { userId, savedPercentile: 92.0 },
  })

  let entR2_92 = await getPreferenceListEntitlement(userId, "Round 2", 92.0)
  console.log("Round 2 (Paid), Perc 92 (Saved) =>", { mode: entR2_92.mode, enablePdf: entR2_92.enablePdf })
  if (entR2_92.mode !== "full" || entR2_92.enablePdf !== true) {
    throw new Error("SCENARIO 2 FAILED")
  }
  console.log("✅ SCENARIO 2 PASSED!\n")

  console.log("--- TEST SCENARIO 3: Return later to Round 2 with 92% ---")
  let entR2_92_return = await getPreferenceListEntitlement(userId, "Round 2", 92.0)
  if (entR2_92_return.mode !== "full" || !entR2_92_return.enablePdf) {
    throw new Error("SCENARIO 3 FAILED")
  }
  console.log("✅ SCENARIO 3 PASSED!\n")

  console.log("--- TEST SCENARIO 4: Use another saved percentile (54%) in Round 2 ---")
  await db.preferenceSavedPercentile.create({
    data: { userId, savedPercentile: 54.0 },
  })
  let entR2_54 = await getPreferenceListEntitlement(userId, "Round 2", 54.0)
  console.log("Round 2 (Paid), Perc 54 (Saved) =>", { mode: entR2_54.mode, enablePdf: entR2_54.enablePdf })
  if (entR2_54.mode !== "full" || !entR2_54.enablePdf) {
    throw new Error("SCENARIO 4 FAILED")
  }
  console.log("✅ SCENARIO 4 PASSED!\n")

  console.log("--- TEST SCENARIO 5: Enter NEW unsaved percentile (81%) in Round 2 (Blocked Mode) ---")
  let entR2_81_before = await getPreferenceListEntitlement(userId, "Round 2", 81.0)
  console.log("Round 2 (Paid), Perc 81 (UNSAVED) =>", {
    mode: entR2_81_before.mode,
    enablePdf: entR2_81_before.enablePdf,
    message: entR2_81_before.message,
  })
  if (entR2_81_before.mode !== "blocked" || entR2_81_before.enablePdf !== false) {
    throw new Error("SCENARIO 5 FAILED")
  }
  console.log("✅ SCENARIO 5 PASSED!\n")

  console.log("--- TEST SCENARIO 6: Purchase +1 Saved Percentile Upgrade (81%) in Round 2 ---")
  await db.preferenceSavedPercentile.create({
    data: { userId, savedPercentile: 81.0 },
  })
  let entR2_81_after = await getPreferenceListEntitlement(userId, "Round 2", 81.0)
  console.log("Round 2 (Paid), Perc 81 (AFTER +1 Upgrade Purchase) =>", {
    mode: entR2_81_after.mode,
    enablePdf: entR2_81_after.enablePdf,
  })
  if (entR2_81_after.mode !== "full" || !entR2_81_after.enablePdf) {
    throw new Error("SCENARIO 6 FAILED")
  }
  console.log("✅ SCENARIO 6 PASSED!\n")

  console.log("--- TEST SCENARIO 7: Cross-Round Isolation (Round 1, Round 3, Round 4 stay locked) ---")
  for (const lockedRound of ["Round 1", "Round 3", "Round 4"]) {
    let ent = await getPreferenceListEntitlement(userId, lockedRound, 92.0)
    console.log(`${lockedRound} (Unpaid), Perc 92 =>`, { mode: ent.mode, enablePdf: ent.enablePdf })
    if (ent.mode !== "preview" || ent.enablePdf !== false) {
      throw new Error(`SCENARIO 7 FAILED for ${lockedRound}`)
    }
  }
  console.log("✅ SCENARIO 7 PASSED!\n")

  console.log("--- PART 2: Premium (₹5000) & Elite (₹6000) Plan Slot Tracking Verification ---")
  await db.preferenceGeneratorPurchase.deleteMany({ where: { userId } })
  await db.preferenceSavedPercentile.deleteMany({ where: { userId } })

  // Upgrade user to Premium Plan (₹5000, 3 slots)
  await db.user.update({ where: { id: userId }, data: { currentPlan: "premium" } })

  console.log("--- TEST SCENARIO 8: Premium Plan (Slot 1 / 3 Auto-save) ---")
  let prem1 = await getPreferenceListEntitlement(userId, "Round 1", 98.21)
  console.log("Premium User, 98.21% =>", { mode: prem1.mode, usedSlots: prem1.usedSlots, totalMaxSlots: prem1.totalMaxSlots })
  if (prem1.mode !== "full" || prem1.usedSlots !== 1 || prem1.totalMaxSlots !== 3) {
    throw new Error("SCENARIO 8 FAILED")
  }
  console.log("✅ SCENARIO 8 PASSED!\n")

  console.log("--- TEST SCENARIO 9: Premium Plan Reuse Saved Percentile (Still 1 / 3 Slots Used) ---")
  let prem1_reuse = await getPreferenceListEntitlement(userId, "Round 2", 98.21)
  console.log("Premium User Reuse 98.21% in Round 2 =>", { mode: prem1_reuse.mode, usedSlots: prem1_reuse.usedSlots, totalMaxSlots: prem1_reuse.totalMaxSlots })
  if (prem1_reuse.mode !== "full" || prem1_reuse.usedSlots !== 1 || prem1_reuse.totalMaxSlots !== 3) {
    throw new Error("SCENARIO 9 FAILED")
  }
  console.log("✅ SCENARIO 9 PASSED!\n")

  console.log("--- TEST SCENARIO 10: Premium Plan (Slot 2 / 3 and Slot 3 / 3 Auto-saves) ---")
  let prem2 = await getPreferenceListEntitlement(userId, "Round 3", 94.56)
  let prem3 = await getPreferenceListEntitlement(userId, "Round 4", 87.34)
  console.log("Premium User, Slot 2 & Slot 3 =>", { usedSlots: prem3.usedSlots, totalMaxSlots: prem3.totalMaxSlots })
  if (prem3.mode !== "full" || prem3.usedSlots !== 3 || prem3.totalMaxSlots !== 3) {
    throw new Error("SCENARIO 10 FAILED")
  }
  console.log("✅ SCENARIO 10 PASSED!\n")

  console.log("--- TEST SCENARIO 11: Premium Plan All 3 Slots Occupied (4th Percentile Blocked) ---")
  let prem4 = await getPreferenceListEntitlement(userId, "Round 1", 84.51)
  console.log("Premium User, 4th New Percentile 84.51% =>", { mode: prem4.mode, message: prem4.message })
  if (prem4.mode !== "blocked" || prem4.usedSlots !== 3 || prem4.totalMaxSlots !== 3) {
    throw new Error("SCENARIO 11 FAILED")
  }
  console.log("✅ SCENARIO 11 PASSED!\n")

  console.log("--- TEST SCENARIO 12: Premium User Purchases +1 Saved Percentile Upgrade (₹599) ---")
  await db.preferenceGeneratorPurchase.create({
    data: { userId, round: "Round 1", savedPercentile: 84.51, status: "Paid", amount: 599 },
  })
  let prem4_after = await getPreferenceListEntitlement(userId, "Round 1", 84.51)
  console.log("Premium User After +1 Upgrade =>", { mode: prem4_after.mode, usedSlots: prem4_after.usedSlots, totalMaxSlots: prem4_after.totalMaxSlots })
  if (prem4_after.mode !== "full" || prem4_after.usedSlots !== 4 || prem4_after.totalMaxSlots !== 4) {
    throw new Error("SCENARIO 12 FAILED")
  }
  console.log("✅ SCENARIO 12 PASSED!\n")

  await db.preferenceGeneratorPurchase.deleteMany({ where: { userId } })
  await db.preferenceSavedPercentile.deleteMany({ where: { userId } })
  await db.user.delete({ where: { id: userId } })

  console.log("=========================================")
  console.log(" ALL 12 VERIFICATION SCENARIOS PASSED 100%!")
  console.log("=========================================")
}

testRules()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed with error:", err)
    process.exit(1)
  })
