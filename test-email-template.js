// Test script to visualize the email template
// This file is for development purposes only
const sampleData = {
  fullName: "John Doe",
  email: "john.doe@example.com",
  password: "SecurePass123!",
  role: "OFFICER",
  designation: "Assistant Collector",
  department: "Revenue Department",
  loginUrl: "http://localhost:3000/login",
};

console.log("Sample Account Creation Email Data:");
console.log("=====================================");
console.log(`Name: ${sampleData.fullName}`);
console.log(`Email: ${sampleData.email}`);
console.log(`Password: ${sampleData.password}`);
console.log(`Role: ${sampleData.role}`);
console.log(`Designation: ${sampleData.designation}`);
console.log(`Department: ${sampleData.department}`);
console.log(`Login URL: ${sampleData.loginUrl}`);
console.log("=====================================");
console.log("Email will be sent with professional template including:");
console.log("- Welcome header with role-specific icon");
console.log("- Account details in formatted card");
console.log("- Security recommendations");
console.log("- Login button with direct access");
console.log("- Professional styling with gradients and responsive design");
