// Debug script to check forwarding data
console.log("Testing forwarding data...");

async function testForwardingData() {
  try {
    const response = await fetch(
      "http://localhost:3000/api/applications?limit=5&includeForwardingHistory=true"
    );
    if (!response.ok) {
      console.log("Response not ok:", response.status, response.statusText);
      return;
    }

    const data = await response.json();
    console.log("Total applications:", data.applications?.length || 0);

    if (data.applications && data.applications.length > 0) {
      data.applications.forEach((app, index) => {
        console.log(`\n--- Application ${index + 1} (${app.id}) ---`);
        console.log(
          "officerForwardings:",
          app.officerForwardings?.length || 0,
          "entries"
        );

        if (app.officerForwardings && app.officerForwardings.length > 0) {
          app.officerForwardings.forEach((forwarding, idx) => {
            console.log(`  Forwarding ${idx + 1}:`);
            console.log("    fromOfficerId:", forwarding.fromOfficerId);
            console.log("    toOfficerId:", forwarding.toOfficerId);
            console.log("    fromOfficer id:", forwarding.fromOfficer?.id);
            console.log(
              "    fromOfficer name:",
              forwarding.fromOfficer?.officerProfile?.fullName
            );
            console.log("    isActive:", forwarding.isActive);
          });
        }
      });
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testForwardingData();
