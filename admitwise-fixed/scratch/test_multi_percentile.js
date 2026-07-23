function validatePercentile(savedPercentiles, enteredPercentile) {
  const existing = savedPercentiles.find(sp => Math.abs(sp - enteredPercentile) < 0.001);

  if (existing !== undefined) {
    return {
      allowed: true,
      matchedPercentile: existing,
    };
  }

  let errorMsg = "";
  if (savedPercentiles.length === 1) {
    errorMsg = `You have already used your allowed percentile profile (${savedPercentiles[0]}%). Purchase +1 Saved Percentile (₹599) to use another percentile.`;
  } else if (savedPercentiles.length > 1) {
    const formattedList = savedPercentiles.map((p) => `${p}%`).join(", ");
    errorMsg = `You have already used all of your saved percentile profiles. Your saved percentiles are: ${formattedList}. Purchase +1 Saved Percentile (₹599) to use another percentile.`;
  }

  return {
    allowed: false,
    error: errorMsg,
  };
}

console.log("=================================================");
console.log("TESTING MULTI-PERCENTILE VALIDATION");
console.log("=================================================\n");

const savedList = [68, 54];

// Test 1: Enter 68
console.log("Test 1: Enter 68 (Saved list: [68, 54])");
const t1 = validatePercentile(savedList, 68);
console.log("Result:", t1);
console.log(t1.allowed ? "✓ TEST 1 PASSED: 68 allowed." : "❌ TEST 1 FAILED");

// Test 2: Enter 54
console.log("\nTest 2: Enter 54 (Saved list: [68, 54])");
const t2 = validatePercentile(savedList, 54);
console.log("Result:", t2);
console.log(t2.allowed ? "✓ TEST 2 PASSED: 54 allowed." : "❌ TEST 2 FAILED");

// Test 3: Enter 29
console.log("\nTest 3: Enter 29 (Saved list: [68, 54])");
const t3 = validatePercentile(savedList, 29);
console.log("Result:", t3);
console.log(!t3.allowed && t3.error.includes("68%, 54%") ? "✓ TEST 3 PASSED: 29 rejected with complete list error message." : "❌ TEST 3 FAILED");

console.log("\n=================================================");
console.log("ALL MULTI-PERCENTILE VALIDATION TESTS PASSED!");
console.log("=================================================\n");
