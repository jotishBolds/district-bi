// Test the queue API endpoints
async function testQueueAPI() {
  const baseUrl = "http://localhost:3000";

  // Test credentials for different frontdesk users
  const frontdeskUsers = [
    { email: "dcfrontdesk@gmail.com", expectedOfficer: "DC" },
    { email: "sdmhqfrontdesk@gmail.com", expectedOfficer: "SDM_HQ" },
    { email: "rcfrontdesk@rc.com", expectedOfficer: "OS_COI_RC" },
  ];

  for (const user of frontdeskUsers) {
    console.log(`\n=== Testing ${user.email} ===`);

    try {
      // Get queue data
      const response = await fetch(`${baseUrl}/api/frontdesk/queue`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // Note: In real test, you'd need to authenticate first
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Queue data:", {
          applications: data.applications?.length || 0,
          assignedOfficers: data.assignedOfficers?.map((o) => ({
            id: o.id,
            fullName: o.fullName,
            designation: o.designation,
          })),
        });
      } else {
        console.log("Error:", response.status, await response.text());
      }
    } catch (error) {
      console.error("Request failed:", error.message);
    }
  }
}

// testQueueAPI();
console.log(
  "Test script ready. Uncomment the last line to run tests after starting the server."
);
