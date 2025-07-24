// Test script to check available officers API behavior
const fetch = require("node-fetch");

async function testAvailableOfficers() {
  console.log("Testing available officers API...");

  try {
    // Test with different user types
    const response = await fetch(
      "http://localhost:3000/api/officers/available",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(
        "Available officers response:",
        JSON.stringify(data, null, 2)
      );
    } else {
      console.log("Response status:", response.status);
      console.log("Response text:", await response.text());
    }
  } catch (error) {
    console.error("Error testing API:", error.message);
  }
}

testAvailableOfficers();
