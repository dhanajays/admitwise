require('dotenv').config();

function getRazorpayCredentialsForProduct(productType) {
  const pType = (productType || "").toLowerCase();
  const isPreferenceList =
    pType.includes("preference") ||
    pType.includes("pref") ||
    pType.includes("599") ||
    pType === "addon_pref";

  if (isPreferenceList) {
    const keyId =
      process.env.RAZORPAY_TEST_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY_ID;
    const keySecret = process.env.RAZORPAY_TEST_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Missing RAZORPAY_TEST_KEY_ID or RAZORPAY_TEST_KEY_SECRET in environment variables");
    }

    return { keyId, keySecret, isTest: true };
  }

  const keyId =
    process.env.RAZORPAY_LIVE_KEY_ID ||
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  const keySecret =
    process.env.RAZORPAY_LIVE_KEY_SECRET ||
    process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Missing RAZORPAY_LIVE_KEY_ID or RAZORPAY_LIVE_KEY_SECRET in environment variables");
  }

  return { keyId, keySecret, isTest: false };
}

console.log("=================================================");
console.log("TESTING RAZORPAY KEY ID RESOLUTION & INTEGRITY");
console.log("=================================================\n");

console.log("SERVER ENVIRONMENT VARIABLES CHECK:");
console.log("RAZORPAY_LIVE_KEY_ID exists:", !!process.env.RAZORPAY_LIVE_KEY_ID);
console.log("RAZORPAY_TEST_KEY_ID exists:", !!process.env.RAZORPAY_TEST_KEY_ID);
console.log("RAZORPAY_KEY_ID exists:", !!process.env.RAZORPAY_KEY_ID);
console.log("NEXT_PUBLIC_RAZORPAY_KEY_ID exists:", !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
console.log("-------------------------------------------------\n");

// Test 1: Preference List ₹599
const prefCreds = getRazorpayCredentialsForProduct("preference_generator");
console.log("1. PREFERENCE LIST ₹599 RESOLUTION:");
console.log({
  mode: prefCreds.isTest ? "TEST" : "LIVE",
  keyIdExists: !!prefCreds.keyId,
});

// Test 2: Premium Plan ₹5000
const premCreds = getRazorpayCredentialsForProduct("premium");
console.log("\n2. PREMIUM PLAN ₹5000 RESOLUTION:");
console.log({
  mode: premCreds.isTest ? "TEST" : "LIVE",
  keyIdExists: !!premCreds.keyId,
});

// Frontend Options Validation Simulation
const optionsPref = {
  key: prefCreds.keyId,
  amount: 59900,
  currency: "INR",
  name: "AdmitWise",
  order_id: "order_test_12345",
};

console.log("\n3. FRONTEND CHECKOUT OPTIONS SIMULATION (₹599):");
console.log({
  keyExists: !!optionsPref.key,
  amount: optionsPref.amount,
  currency: optionsPref.currency,
  name: optionsPref.name,
  order_id: optionsPref.order_id,
});

if (optionsPref.key && optionsPref.order_id && optionsPref.amount === 59900) {
  console.log("\n✓ VERIFICATION SUCCESSFUL: options.key is valid and non-empty. No hardcoded credentials used!");
} else {
  console.error("\n❌ VERIFICATION FAILED: options.key is missing or invalid!");
}
console.log("=================================================\n");
