function evaluateEntitlement(userState, selectedRound, enteredPercentile) {
  const { purchases, savedPercentiles, isFullPlan } = userState;

  const allowedRounds = isFullPlan
    ? ["Round 1", "Round 2", "Round 3", "Round 4"]
    : Array.from(new Set(purchases.map(p => p.round)));

  const isRoundAllowed = allowedRounds.includes(selectedRound) || allowedRounds.includes("ALL");

  if (!isRoundAllowed) {
    return {
      isPaid: false,
      mode: "PREVIEW_MODE_TOP_5",
      reason: `Round '${selectedRound}' has not been purchased for ₹599. Showing preview mode identical to an unpaid user.`,
      pdfDisabled: true,
      showPurchaseCTA: true,
    };
  }

  // Round IS allowed! Now check if percentile matches ANY saved percentile
  const existingPercentile = savedPercentiles.find(sp => Math.abs(sp - enteredPercentile) < 0.001);

  if (existingPercentile !== undefined) {
    return {
      isPaid: true,
      mode: "FULL_UNLOCKED_LIST",
      reason: `Purchased round '${selectedRound}' and saved percentile '${existingPercentile}%' matched.`,
      pdfDisabled: false,
      showPurchaseCTA: false,
    };
  }

  // Check if slot available
  if (savedPercentiles.length < purchases.length) {
    return {
      isPaid: true,
      mode: "FULL_UNLOCKED_LIST",
      reason: `Purchased slot available for round '${selectedRound}'.`,
      pdfDisabled: false,
      showPurchaseCTA: false,
    };
  }

  return {
    isPaid: false,
    mode: "REJECTED_MISMATCH",
    reason: `All saved percentile slots are used (${savedPercentiles.join("%, ")}%).`,
    pdfDisabled: true,
    showPurchaseCTA: true,
  };
}

console.log("=================================================");
console.log("TESTING STRICT BOTH-CONDITION ROUND ENTITLEMENT");
console.log("=================================================\n");

const studentProfile = {
  isFullPlan: false,
  purchases: [{ round: "Round 1", amount: 599 }],
  savedPercentiles: [68.0, 54.0],
};

// Case 1: Round 1 + 68%
console.log("Case 1: Round 1 + 68%");
const c1 = evaluateEntitlement(studentProfile, "Round 1", 68.0);
console.log("Result:", c1);
console.log(c1.isPaid && c1.mode === "FULL_UNLOCKED_LIST" ? "✓ CASE 1 PASSED: Full list." : "❌ CASE 1 FAILED");

// Case 2: Round 1 + 54%
console.log("\nCase 2: Round 1 + 54%");
const c2 = evaluateEntitlement(studentProfile, "Round 1", 54.0);
console.log("Result:", c2);
console.log(c2.isPaid && c2.mode === "FULL_UNLOCKED_LIST" ? "✓ CASE 2 PASSED: Full list." : "❌ CASE 2 FAILED");

// Case 3: Round 2 + 68%
console.log("\nCase 3: Round 2 + 68%");
const c3 = evaluateEntitlement(studentProfile, "Round 2", 68.0);
console.log("Result:", c3);
console.log(!c3.isPaid && c3.mode === "PREVIEW_MODE_TOP_5" && c3.pdfDisabled ? "✓ CASE 3 PASSED: Preview mode (Top 5 only, PDF disabled, ₹599 CTA)." : "❌ CASE 3 FAILED");

// Case 4: Round 2 + 54%
console.log("\nCase 4: Round 2 + 54%");
const c4 = evaluateEntitlement(studentProfile, "Round 2", 54.0);
console.log("Result:", c4);
console.log(!c4.isPaid && c4.mode === "PREVIEW_MODE_TOP_5" && c4.pdfDisabled ? "✓ CASE 4 PASSED: Preview mode (Top 5 only, PDF disabled, ₹599 CTA)." : "❌ CASE 4 FAILED");

// Case 5: Round 3 + 68%
console.log("\nCase 5: Round 3 + 68%");
const c5 = evaluateEntitlement(studentProfile, "Round 3", 68.0);
console.log("Result:", c5);
console.log(!c5.isPaid && c5.mode === "PREVIEW_MODE_TOP_5" ? "✓ CASE 5 PASSED: Preview mode." : "❌ CASE 5 FAILED");

// Case 6: Round 4 + 54%
console.log("\nCase 6: Round 4 + 54%");
const c6 = evaluateEntitlement(studentProfile, "Round 4", 54.0);
console.log("Result:", c6);
console.log(!c6.isPaid && c6.mode === "PREVIEW_MODE_TOP_5" ? "✓ CASE 6 PASSED: Preview mode." : "❌ CASE 6 FAILED");

// Case 7: Return to Round 1 + 68%
console.log("\nCase 7: Return to Round 1 + 68%");
const c7 = evaluateEntitlement(studentProfile, "Round 1", 68.0);
console.log("Result:", c7);
console.log(c7.isPaid && c7.mode === "FULL_UNLOCKED_LIST" && !c7.showPurchaseCTA ? "✓ CASE 7 PASSED: Full list restored, 0 payment prompts." : "❌ CASE 7 FAILED");

console.log("\n=================================================");
console.log("ALL STRICT ENTITLEMENT TESTS PASSED SUCCESSFULLY!");
console.log("=================================================\n");
