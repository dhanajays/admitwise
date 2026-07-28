require('dotenv').config();

function getRazorpayCredentialsForProduct(productType) {
  const pType = (productType || "").toLowerCase();
  const isPreferenceList =
    pType.includes("preference") ||
    pType.includes("pref") ||
    pType === "599" ||
    pType === "addon_pref";

  if (isPreferenceList) {
    const keyId =
      process.env.RAZORPAY_TEST_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY_ID ||
      "";
    const keySecret = process.env.RAZORPAY_TEST_KEY_SECRET || "";
    return { keyId, keySecret, isTest: true };
  }

  const keyId =
    process.env.RAZORPAY_LIVE_KEY_ID ||
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    "";
  const keySecret =
    process.env.RAZORPAY_LIVE_KEY_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    "";
  return { keyId, keySecret, isTest: false };
}

console.log("=========================================");
console.log("TESTING PRODUCT-DRIVEN RAZORPAY MODE");
console.log("=========================================\n");

const p1 = getRazorpayCredentialsForProduct("preference_generator");
console.log("1. Product: Preference List ₹599");
console.log("   keyId:", p1.keyId, "| isTest:", p1.isTest);

const p2 = getRazorpayCredentialsForProduct("premium");
console.log("\n2. Product: Premium ₹5000");
console.log("   keyId:", p2.keyId, "| isTest:", p2.isTest);

const p3 = getRazorpayCredentialsForProduct("elite");
console.log("\n3. Product: Elite ₹6000");
console.log("   keyId:", p3.keyId, "| isTest:", p3.isTest);

if (p1.isTest === true && p2.isTest === false && p3.isTest === false && p1.keyId && p2.keyId) {
  console.log("\n✓ VERIFICATION SUCCESSFUL: Environment variables loaded correctly with 0 hardcoded secrets.");
} else {
  console.error("\n❌ Product-driven verification failed!");
}
