// Test the API endpoint directly
const fetch = require("node-fetch");

async function testAPI() {
  try {
    console.log("Testing API endpoint...");

    // Make a request to the API
    const response = await fetch(
      "http://localhost:3000/api/applications?page=1&limit=5"
    );

    if (!response.ok) {
      console.error(
        "API request failed:",
        response.status,
        response.statusText
      );
      return;
    }

    const data = await response.json();

    console.log("API Response structure:");
    console.log("Applications count:", data.applications?.length || 0);

    if (data.applications && data.applications.length > 0) {
      const firstApp = data.applications[0];
      console.log("\nFirst application:");
      console.log("ID:", firstApp.id);
      console.log("Documents count:", firstApp.documents?.length || 0);

      if (firstApp.documents && firstApp.documents.length > 0) {
        console.log("\nFirst document:");
        const firstDoc = firstApp.documents[0];
        console.log("Document object:", JSON.stringify(firstDoc, null, 2));
      }
    }
  } catch (error) {
    console.error("Error testing API:", error.message);
  }
}

testAPI();
