// Final test for service category color improvements
const { PrismaClient } = require("./app/generated/prisma");

async function testColorImprovements() {
  const prisma = new PrismaClient();

  try {
    console.log("🎨 Testing Service Category Color Improvements...\n");

    // Test 1: Ensure some categories have different colors for testing
    console.log("1. Setting up test colors for better visibility...");

    const categories = await prisma.serviceCategory.findMany({
      select: { id: true, name: true, color: true },
    });

    const testColors = [
      "#e3f2fd", // Very light blue
      "#f3e5f5", // Very light purple
      "#e8f5e8", // Very light green
      "#fff3e0", // Very light orange
      "#ffebee", // Very light red
      "#f1f8e9", // Very light lime
      "#fce4ec", // Very light pink
      "#e0f2f1", // Very light teal
      "#f9fbe7", // Very light yellow-green
    ];

    for (let i = 0; i < Math.min(categories.length, testColors.length); i++) {
      if (!categories[i].color) {
        await prisma.serviceCategory.update({
          where: { id: categories[i].id },
          data: { color: testColors[i] },
        });
        console.log(`  ✅ Set ${categories[i].name} to ${testColors[i]}`);
      }
    }

    // Test 2: Test contrast function simulation
    console.log("\n2. Testing color contrast calculations...");

    const testColorsForContrast = [
      "#e3f2fd", // Light blue
      "#1976d2", // Dark blue
      "#ffeb3b", // Yellow
      "#212121", // Very dark
      "#ffffff", // White
      "#ff5722", // Orange-red
    ];

    testColorsForContrast.forEach((color) => {
      // Simulate the contrast calculation from the component
      const hex = color.replace("#", "");
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      const textColor = luminance > 0.5 ? "#1f2937" : "#f9fafb";
      const isLight = luminance > 0.5 ? "Light" : "Dark";

      console.log(`  ${color} (${isLight}) → Text: ${textColor}`);
    });

    // Test 3: Check if applications exist for testing
    console.log("\n3. Checking applications for badge testing...");
    const applications = await prisma.application.findMany({
      include: {
        serviceCategory: {
          select: { id: true, name: true, color: true },
        },
      },
      take: 3,
    });

    console.log(`Found ${applications.length} applications for testing`);
    applications.forEach((app) => {
      console.log(
        `  - ${app.rrNumber || "No RR"}: ${app.serviceCategory.name} (${
          app.serviceCategory.color || "No color"
        })`
      );
    });

    console.log("\n✅ Color improvements test completed!");
    console.log("\n🚀 Ready for testing in browser:");
    console.log(
      "   • Frontdesk Dashboard: http://localhost:3000/dashboard/frontdesk-dashboard"
    );
    console.log(
      "   • Officer Verify: http://localhost:3000/dashboard/officers-verify"
    );
    console.log(
      "   • DC Dashboard: http://localhost:3000/dashboard/application-progress"
    );
    console.log("\n📝 Test checklist:");
    console.log("   ✅ Colors should be visible with good contrast");
    console.log("   ✅ Service category badges should be clickable");
    console.log("   ✅ Modal should open when clicking badges");
    console.log("   ✅ Text should be readable on all color backgrounds");
  } catch (error) {
    console.error("❌ Error during color testing:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testColorImprovements();
