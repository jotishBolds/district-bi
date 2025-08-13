// Test script to verify service category color functionality
const { PrismaClient } = require("./app/generated/prisma");

async function testColorFunctionality() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Testing Service Category Color Functionality...\n");

    // Test 1: Check if color field exists in schema
    console.log("1. Checking database schema for color field...");
    const categories = await prisma.serviceCategory.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        createdAt: true,
      },
    });

    console.log(`✅ Found ${categories.length} service categories`);
    console.log("Sample categories with colors:");
    categories.slice(0, 3).forEach((cat) => {
      console.log(`  - ${cat.name}: ${cat.color || "No color set"}`);
    });

    // Test 2: Update a category with a color if none exists
    console.log("\n2. Testing color update functionality...");
    const categoryToUpdate = categories.find((cat) => !cat.color);

    if (categoryToUpdate) {
      const testColor = "#ff6b6b";
      await prisma.serviceCategory.update({
        where: { id: categoryToUpdate.id },
        data: { color: testColor },
      });
      console.log(
        `✅ Updated category "${categoryToUpdate.name}" with color ${testColor}`
      );
    } else {
      console.log("✅ All categories already have colors assigned");
    }

    // Test 3: Create a new test category with color
    console.log("\n3. Testing new category creation with color...");
    const testCategoryName = `Test-Color-Category-${Date.now()}`;
    const testCategory = await prisma.serviceCategory.create({
      data: {
        name: testCategoryName,
        description: "Test category for color functionality",
        color: "#4ecdc4",
      },
    });
    console.log(
      `✅ Created test category "${testCategory.name}" with color ${testCategory.color}`
    );

    // Clean up test category
    await prisma.serviceCategory.delete({
      where: { id: testCategory.id },
    });
    console.log(`✅ Cleaned up test category`);

    console.log("\n🎉 All color functionality tests passed!");
  } catch (error) {
    console.error("❌ Error testing color functionality:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testColorFunctionality();
