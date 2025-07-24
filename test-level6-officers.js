// Test script to verify officer role mappings
const {
  getForwardableOfficerRoles,
  getRoleMapping,
} = require("./lib/officer-roles.ts");

console.log("Testing level 6 officers inclusion...");

try {
  const forwardableRoles = getForwardableOfficerRoles();
  console.log("\nForwardable officer roles:");

  forwardableRoles.forEach((role) => {
    const mapping = getRoleMapping(role);
    if (mapping) {
      console.log(
        `- ${role}: Level ${mapping.level}, Type: ${mapping.userType}, Name: ${mapping.fullName}`
      );
    }
  });

  // Specifically check level 6 roles
  const level6Roles = ["OS_COI_RC", "OS_RC", "RI_LEGAL"];
  console.log("\nLevel 6 roles status:");
  level6Roles.forEach((role) => {
    const included = forwardableRoles.includes(role);
    const mapping = getRoleMapping(role);
    console.log(
      `- ${role}: ${included ? "✅ INCLUDED" : "❌ EXCLUDED"} (${
        mapping?.userType
      })`
    );
  });
} catch (error) {
  console.error("Error:", error.message);
}
