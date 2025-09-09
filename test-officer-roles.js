// Test script to verify officer roles and document access
const { UserRole } = require("./app/generated/prisma");
const {
  getAllOfficerRoles,
  isOfficerOrOfficial,
  isAdminRole,
} = require("./lib/officer-roles");

console.log("=== Testing Officer Roles Access ===");
console.log("All Officer Roles:", getAllOfficerRoles());
console.log("\n=== Testing Specific Roles ===");

// Test DC role
console.log("DC isOfficerOrOfficial:", isOfficerOrOfficial(UserRole.DC));
console.log("DC isAdminRole:", isAdminRole(UserRole.DC));

// Test other officer roles
console.log("ADC isOfficerOrOfficial:", isOfficerOrOfficial(UserRole.ADC));
console.log("SDM isOfficerOrOfficial:", isOfficerOrOfficial(UserRole.SDM));
console.log("AC isOfficerOrOfficial:", isOfficerOrOfficial(UserRole.AC));

// Test admin roles
console.log("ADMIN isAdminRole:", isAdminRole(UserRole.ADMIN));
console.log("SUPER_ADMIN isAdminRole:", isAdminRole(UserRole.SUPER_ADMIN));

// Test front desk
console.log(
  "FRONT_DESK isOfficerOrOfficial:",
  isOfficerOrOfficial(UserRole.FRONT_DESK)
);

console.log("\n=== All User Roles ===");
Object.values(UserRole).forEach((role) => {
  console.log(
    `${role}: Officer/Official=${isOfficerOrOfficial(
      role
    )}, Admin=${isAdminRole(role)}`
  );
});
