// Test script to verify RR number generation
const testRRFormats = [
  "RR-250911-1035-01", // New format - first app at 10:35
  "RR-250911-1035-02", // New format - second app on same day
  "RR-250911-1036-03", // New format - third app on same day (different time)
  "RR-2025-1234", // Old format for backward compatibility
];

console.log("Testing RR Number Format Validation:");
console.log("=====================================");

// Test with tracking page regex pattern
const newRRPattern = /^RR-(\d{4}-\d{4}|\d{6}-\d{4}-\d{2})$/i;

testRRFormats.forEach((rr) => {
  const isValid = newRRPattern.test(rr);
  console.log(`${rr}: ${isValid ? "✅ VALID" : "❌ INVALID"}`);
});

console.log("\nRR Format Structure:");
console.log("RR-YYMMDD-HHMM-XX");
console.log("  └─ YY: Year (25 = 2025)");
console.log("  └─ MM: Month (09 = September)");
console.log("  └─ DD: Day (11 = 11th)");
console.log("  └─ HH: Hour (10 = 10 AM)");
console.log("  └─ MM: Minute (35 = 35 minutes)");
console.log("  └─ XX: Sequential number for that day (01, 02, 03...)");

console.log("\nExample scenarios:");
console.log("- First application on Sep 11, 2025 at 10:35: RR-250911-1035-01");
console.log("- Second application same day (any time): RR-250911-1036-02");
console.log("- Third application same day (any time): RR-250911-1037-03");
console.log("- First application on Sep 12, 2025: RR-250912-0800-01");

console.log(
  "\nKey feature: Last part (XX) increments for each application on the same day!"
);
