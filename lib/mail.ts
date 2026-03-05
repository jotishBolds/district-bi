// lib/mail.ts
import nodemailer from "nodemailer";

const isProduction = process.env.NODE_ENV === "production";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: process.env.EMAIL_SERVER_SECURE === "true",
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

// Helper function to log OTP events (without sensitive data)
function logOTPEvent(email: string, type: string) {
  // Mask email for logging
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1***$3");
  console.log(`[OTP] ${type} sent to: ${maskedEmail}`);
}

export async function sendOTPEmail(to: string, otp: string) {
  const emailType = "GENERAL_OTP";

  // Log event without sensitive data
  logOTPEvent(to, emailType);

  // Send actual email in both development and production
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "Your One-Time Password",
    text: `Your OTP for authentication is: ${otp}. This code will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Your One-Time Password</h2>
        <p style="font-size: 16px; color: #555;">Please use the following code to verify your account:</p>
        <div style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #777;">This code will expire in 10 minutes.</p>
        <p style="font-size: 14px; color: #777;">If you did not request this code, please ignore this email.</p>
      </div>
    `,
  };

  try {
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
}

export async function sendVerificationEmail(to: string, otp: string) {
  const emailType = "EMAIL_VERIFICATION";

  // Log event without sensitive data
  logOTPEvent(to, emailType);

  // Send actual email in both development and production
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "Verify Your Email Address",
    text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p style="font-size: 16px; color: #555;">Thank you for registering! Please use the following code to verify your email address:</p>
        <div style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #777;">This code will expire in 10 minutes.</p>
        <p style="font-size: 14px; color: #777;">If you did not create an account, please ignore this email.</p>
      </div>
    `,
  };

  try {
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw new Error("Failed to send verification email");
  }
}

export async function sendPasswordResetEmail(to: string, otp: string) {
  const emailType = "PASSWORD_RESET";

  // Log event without sensitive data
  logOTPEvent(to, emailType);

  // Send actual email in both development and production
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "Password Reset Request",
    text: `Your password reset code is: ${otp}. This code will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p style="font-size: 16px; color: #555;">We received a request to reset your password. Please use the following code to proceed:</p>
        <div style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #777;">This code will expire in 10 minutes.</p>
        <p style="font-size: 14px; color: #777;">If you did not request a password reset, please ignore this email.</p>
      </div>
    `,
  };

  try {
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
}

export async function sendLoginOTPEmail(to: string, otp: string) {
  const emailType = "LOGIN_OTP";

  // Log event without sensitive data
  logOTPEvent(to, emailType);

  // Send actual email in both development and production
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "Login Verification Code",
    text: `Your login verification code is: ${otp}. This code will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Login Verification Code</h2>
        <p style="font-size: 16px; color: #555;">Please use the following code to complete your login:</p>
        <div style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #777;">This code will expire in 10 minutes.</p>
        <p style="font-size: 14px; color: #777;">If you did not attempt to login, please ignore this email.</p>
      </div>
    `,
  };

  try {
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send login OTP email:", error);
    throw new Error("Failed to send login OTP email");
  }
}

interface AccountCreationEmailData {
  fullName: string;
  email: string;
  password: string;
  role: string;
  designation?: string;
  department?: string;
  loginUrl?: string;
}

export async function sendAccountCreationEmail(data: AccountCreationEmailData) {
  const { fullName, email, password, role, designation, department, loginUrl } =
    data;

  // Helper function to get role display name and color
  const getRoleInfo = (userRole: string) => {
    switch (userRole.toUpperCase()) {
      case "SUPER_ADMIN":
        return {
          displayName: "Super Administrator",
          color: "#dc2626",
          icon: "👑",
        };
      case "ADMIN":
        return { displayName: "Administrator", color: "#7c3aed", icon: "🔧" };
      case "OFFICER":
        return { displayName: "Officer", color: "#059669", icon: "👮" };
      case "FRONT_DESK":
        return { displayName: "Front Desk", color: "#2563eb", icon: "🏢" };
      case "DC":
        return {
          displayName: "District Collector",
          color: "#dc2626",
          icon: "🏛️",
        };
      default:
        return { displayName: role, color: "#6b7280", icon: "👤" };
    }
  };

  const roleInfo = getRoleInfo(role);
  const defaultLoginUrl =
    loginUrl ||
    `${
      isProduction
        ? "http://myapplication.dacgangtok.in/"
        : "http://localhost:3000"
    }/login`;

  // Log account creation in development
  if (!isProduction) {
    console.log("=".repeat(60));
    console.log("📧 ACCOUNT CREATED FOR:", email);
    console.log("👤 FULL NAME:", fullName);
    console.log("🔐 PASSWORD:", password);
    console.log("👔 ROLE:", roleInfo.displayName);
    console.log("🏢 DESIGNATION:", designation || "N/A");
    console.log("🏛️ DEPARTMENT:", department || "N/A");
    console.log("🔗 LOGIN URL:", defaultLoginUrl);
    console.log("=".repeat(60));
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Welcome to My Application - Your Account Has Been Created`,
    text: `
Welcome to My Application!

Your account has been successfully created. Here are your login credentials:

Name: ${fullName}
Email: ${email}
Password: ${password}
Role: ${roleInfo.displayName}
${designation ? `Designation: ${designation}` : ""}
${department ? `Department: ${department}` : ""}

You can access your account at: ${defaultLoginUrl}

For security reasons, we recommend changing your password after your first login.

If you have any questions or need assistance, please contact your administrator.

Best regards,
My Application Team
District Administrative Centre, Gangtok
    `,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to My Application</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
            <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 50%; margin-bottom: 15px;">
              <span style="font-size: 40px;">${roleInfo.icon}</span>
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
              Welcome to My Application
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
              Your account has been successfully created
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            
            <!-- Greeting -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">
                Hello ${fullName}!
              </h2>
              <p style="color: #6b7280; margin: 0; font-size: 16px; line-height: 1.6;">
                Your account has been created and you can now access the My Application system. Below are your login credentials:
              </p>
            </div>

            <!-- Account Details Card -->
            <div style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 25px; margin: 25px 0;">
              <h3 style="color: #374151; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
                <span style="margin-right: 10px;">🔐</span>
                Your Account Details
              </h3>
              
              <div style="space-y: 15px;">
                <div style="margin-bottom: 15px;">
                  <span style="display: inline-block; width: 100px; color: #6b7280; font-weight: 500; font-size: 14px;">Name:</span>
                  <span style="color: #1f2937; font-weight: 600; font-size: 16px;">${fullName}</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <span style="display: inline-block; width: 100px; color: #6b7280; font-weight: 500; font-size: 14px;">Email:</span>
                  <span style="color: #1f2937; font-weight: 600; font-size: 16px;">${email}</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <span style="display: inline-block; width: 100px; color: #6b7280; font-weight: 500; font-size: 14px;">Password:</span>
                  <span style="color: #dc2626; font-weight: 700; font-size: 16px; background-color: #fef2f2; padding: 4px 8px; border-radius: 4px; font-family: 'Courier New', monospace;">${password}</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <span style="display: inline-block; width: 100px; color: #6b7280; font-weight: 500; font-size: 14px;">Role:</span>
                  <span style="color: ${
                    roleInfo.color
                  }; font-weight: 600; font-size: 16px;">
                    ${roleInfo.icon} ${roleInfo.displayName}
                  </span>
                </div>
                
                ${
                  designation
                    ? `
                <div style="margin-bottom: 15px;">
                  <span style="display: inline-block; width: 100px; color: #6b7280; font-weight: 500; font-size: 14px;">Designation:</span>
                  <span style="color: #1f2937; font-weight: 600; font-size: 16px;">${designation}</span>
                </div>
                `
                    : ""
                }
                
                ${
                  department
                    ? `
                <div style="margin-bottom: 15px;">
                  <span style="display: inline-block; width: 100px; color: #6b7280; font-weight: 500; font-size: 14px;">Department:</span>
                  <span style="color: #1f2937; font-weight: 600; font-size: 16px;">${department}</span>
                </div>
                `
                    : ""
                }
              </div>
            </div>

         

            <!-- Security Notice -->
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
              <h4 style="color: #92400e; margin: 0 0 8px 0; font-size: 16px; font-weight: 600; display: flex; align-items: center;">
                <span style="margin-right: 8px;">⚠️</span>
                Important Security Information
              </h4>
              <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
                For your security, we strongly recommend changing your password after your first login. Keep your credentials secure and do not share them with anyone.
              </p>
            </div>

            <!-- Support -->
            <div style="border-top: 1px solid #e5e7eb; padding-top: 25px; margin-top: 30px;">
              <h4 style="color: #374151; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                Need Help?
              </h4>
              <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
                If you have any questions or need assistance, please contact your system administrator or IT support team.
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              This is an automated message from My Application System.<br>
              Please do not reply to this email.
            </p>
            <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
              © ${new Date().getFullYear()} My Application - District Administrative Centre, Gangtok. All rights reserved.
            </p>
          </div>

        </div>
      </body>
      </html>
    `,
  };

  try {
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send account creation email:", error);
    throw new Error("Failed to send account creation email");
  }
}

// Email notification for application creation
interface ApplicationCreatedEmailData {
  to: string;
  citizenName: string;
  rrNumber: string;
  subject: string;
  departmentName?: string; // Optional for citizens
  createdDate: string;
  trackingUrl: string;
}

export async function sendApplicationCreatedEmail(
  data: ApplicationCreatedEmailData
) {
  const {
    to,
    citizenName,
    rrNumber,
    subject,
    departmentName,
    createdDate,
    trackingUrl,
  } = data;

  // Log in development
  if (!isProduction) {
    console.log("=".repeat(60));
    console.log("📧 APPLICATION CREATED EMAIL FOR:", to);
    console.log("👤 CITIZEN NAME:", citizenName);
    console.log("🆔 RR NUMBER:", rrNumber);
    console.log("📋 SUBJECT:", subject);
    console.log("🏢 DEPARTMENT:", departmentName);
    console.log("📅 CREATED:", createdDate);
    console.log("🔗 TRACKING URL:", trackingUrl);
    console.log("=".repeat(60));
  }

  // Handle date formatting - ensure we get a proper Date object
  let formattedDate: string;
  try {
    const dateObj = new Date();
    formattedDate = dateObj.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  } catch (error) {
    // Fallback to current date if parsing fails
    formattedDate = new Date().toLocaleDateString("en-IN");
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: `Application Created Successfully - RR Number: ${rrNumber}`,
    text: `
Dear ${citizenName},

Your application has been successfully created at My Application.

Application Details:
- RR Number: ${rrNumber}
- Subject: ${subject}${
      departmentName ? `\n- Department: ${departmentName}` : ""
    }
- Date Created: ${formattedDate}

You can track your application progress at any time using the following link:
${trackingUrl}

Please save your RR Number (${rrNumber}) for future reference and tracking.

Thank you for using My Application.

Best regards,
District Administrative Centre, Gangtok
    `,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Created Successfully</title>
        <style>
          @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content { padding: 20px !important; }
            .header-padding { padding: 20px !important; }
            .rr-number { font-size: 20px !important; }
            .button { padding: 12px 20px !important; font-size: 14px !important; }
            .details-table { padding: 15px !important; }
            .detail-row { margin-bottom: 12px !important; }
            .detail-label { display: block !important; width: auto !important; margin-bottom: 5px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; line-height: 1.6;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div class="header-padding" style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
              My Application
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
              District Administrative Centre, Gangtok
            </p>
          </div>

          <!-- Content -->
          <div class="content" style="padding: 40px 30px;">
            
            <!-- Greeting -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">
                Dear ${citizenName},
              </h2>
              <p style="color: #6b7280; margin: 0; font-size: 16px; line-height: 1.6;">
                Your application has been successfully submitted and processed. We have assigned a unique reference number for tracking your application.
              </p>
            </div>

            <!-- Success Message -->
            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: center;">
              <div style="color: #065f46; margin-bottom: 10px;">
                <svg style="width: 48px; height: 48px; margin: 0 auto 15px; display: block;" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              </div>
              <h3 style="color: #065f46; margin: 0; font-size: 20px; font-weight: 700;">
                Application Successfully Created
              </h3>
              <p style="color: #047857; margin: 10px 0 0 0; font-size: 14px; font-weight: 500;">
                Your application is now in the system and will be processed shortly
              </p>
            </div>

            <!-- RR Number Highlight -->
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 16px; padding: 30px; margin-bottom: 30px; text-align: center; border: 3px solid #f59e0b; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);">
              <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                🆔 Your Reference Number
              </h3>
              <div style="background-color: #ffffff; border-radius: 12px; padding: 20px; border: 2px solid #d97706; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);">
                <span class="rr-number" style="color: #b45309; font-size: 28px; font-weight: 800; letter-spacing: 3px; font-family: 'Courier New', monospace;">
                  ${rrNumber}
                </span>
              </div>
              <p style="color: #92400e; margin: 15px 0 0 0; font-size: 13px; font-weight: 600;">
                📌 Please save this number for future reference and tracking
              </p>
            </div>

            <!-- Application Details -->
            <div class="details-table" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid #e2e8f0;">
              <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px; font-weight: 700; border-bottom: 3px solid #800020; padding-bottom: 10px; display: inline-block;">
                📋 Application Details
              </h3>
              
              <div class="detail-row" style="margin-bottom: 18px; padding: 12px; background-color: #ffffff; border-radius: 8px; border-left: 4px solid #800020;">
                <span class="detail-label" style="display: inline-block; width: 140px; color: #6b7280; font-weight: 600; font-size: 14px;">📝 Subject:</span>
                <span style="color: #1f2937; font-weight: 600; font-size: 16px;">${subject}</span>
              </div>
              
              ${
                departmentName
                  ? `
              <div class="detail-row" style="margin-bottom: 18px; padding: 12px; background-color: #ffffff; border-radius: 8px; border-left: 4px solid #800020;">
                <span class="detail-label" style="display: inline-block; width: 140px; color: #6b7280; font-weight: 600; font-size: 14px;">🏢 Department:</span>
                <span style="color: #1f2937; font-weight: 600; font-size: 16px;">${departmentName}</span>
              </div>
              `
                  : ""
              }
              
              <div class="detail-row" style="margin-bottom: 18px; padding: 12px; background-color: #ffffff; border-radius: 8px; border-left: 4px solid #800020;">
                <span class="detail-label" style="display: inline-block; width: 140px; color: #6b7280; font-weight: 600; font-size: 14px;">📅 Created:</span>
                <span style="color: #1f2937; font-weight: 600; font-size: 16px;">${formattedDate}</span>
              </div>
            </div>

            <!-- Tracking Button -->
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${trackingUrl}" class="button" style="background: linear-gradient(135deg, #800020 0%, #600018 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 6px 20px rgba(128, 0, 32, 0.3); transition: all 0.3s ease; border: 2px solid transparent;">
                🔍 Track Your Application
              </a>
              <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 13px;">
                Click the button above or visit: <a href="${trackingUrl}" style="color: #800020; text-decoration: none; font-weight: 600;">${trackingUrl}</a>
              </p>
            </div>

            <!-- Next Steps -->
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 6px solid #3b82f6; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
              <h4 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px; font-weight: 700; display: flex; align-items: center;">
                🚀 What happens next?
              </h4>
              <ul style="color: #1f2937; margin: 0; padding-left: 0; list-style: none; line-height: 1.8;">
                <li style="margin-bottom: 12px; padding-left: 25px; position: relative;">
                  <span style="position: absolute; left: 0; color: #3b82f6; font-weight: bold;">1.</span>
                  Your application will be reviewed by the concerned department
                </li>
                <li style="margin-bottom: 12px; padding-left: 25px; position: relative;">
                  <span style="position: absolute; left: 0; color: #3b82f6; font-weight: bold;">2.</span>
                  You will receive email updates on the progress automatically
                </li>
                <li style="margin-bottom: 12px; padding-left: 25px; position: relative;">
                  <span style="position: absolute; left: 0; color: #3b82f6; font-weight: bold;">3.</span>
                  Use your RR Number <strong>${rrNumber}</strong> to track status anytime
                </li>
                <li style="margin-bottom: 12px; padding-left: 25px; position: relative;">
                  <span style="position: absolute; left: 0; color: #3b82f6; font-weight: bold;">4.</span>
                  You may be contacted if additional information is required
                </li>
              </ul>
            </div>

            <!-- Contact Information -->
            <div style="background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%); border-radius: 12px; padding: 25px; text-align: center; border: 1px solid #d1d5db;">
              <h4 style="color: #374151; margin: 0 0 15px 0; font-size: 16px; font-weight: 700;">
                📞 Need Help?
              </h4>
              <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                For any queries or assistance, please contact:
              </p>
              <p style="color: #1f2937; margin: 0; font-weight: 700; font-size: 18px;">
                District Administrative Centre, Gangtok
              </p>
              <p style="color: #800020; margin: 10px 0 0 0; font-size: 14px; font-weight: 600;">
                🌐 Visit: <a href="${trackingUrl}" style="color: #800020; text-decoration: none;">${trackingUrl}</a>
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 25px; text-align: center;">
            <p style="color: #9ca3af; margin: 0 0 10px 0; font-size: 13px;">
              This is an automated message from My Application. Please do not reply to this email.
            </p>
            <p style="color: #6b7280; margin: 0; font-size: 12px;">
              © ${new Date().getFullYear()} District Administrative Centre, Gangtok. All rights reserved.
            </p>
          </div>

        </div>
      </body>
      </html>
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Application created email sent successfully to: ${to}`);
    return result;
  } catch (error) {
    console.error("Failed to send application created email:", error);
    throw new Error("Failed to send application created email");
  }
}

// Feedback email template
export async function sendFeedbackEmail(
  email: string,
  phone: string,
  message: string
) {
  const subject = "New Feedback Received - District Administrative Centre";

  // Log in development
  if (!isProduction) {
    console.log("=".repeat(60));
    console.log("📧 FEEDBACK EMAIL RECEIVED");
    console.log("👤 EMAIL:", email);
    console.log("📞 PHONE:", phone);
    console.log(
      "💬 MESSAGE:",
      message.substring(0, 100) + (message.length > 100 ? "..." : "")
    );
    console.log("=".repeat(60));
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_FROM, // Send to admin/support email
    subject,
    text: `
New feedback received from the District Administrative Centre support system.

Feedback Details:
- Email: ${email}
- Phone: ${phone}
- Message: ${message}

Date: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}

Please review and respond to this feedback as appropriate.

Best regards,
District Administrative Centre Support System
    `,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Feedback Received</title>
        <style>
          @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content { padding: 20px !important; }
            .header-padding { padding: 20px !important; }
            .feedback-card { padding: 20px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; line-height: 1.6;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <div class="header-padding" style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
              New Feedback Received
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">
              District Administrative Centre Support System
            </p>
          </div>

          <!-- Content -->
          <div class="content" style="padding: 40px 30px;">

            <!-- Alert -->
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 6px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px; font-weight: 700; display: flex; align-items: center;">
                <span style="margin-right: 8px;">💬</span>
                New User Feedback
              </h3>
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                A user has submitted feedback through the support system. Please review the details below.
              </p>
            </div>

            <!-- Feedback Details -->
            <div class="feedback-card" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid #e2e8f0;">
              <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px; font-weight: 700; border-bottom: 3px solid #800020; padding-bottom: 10px; display: inline-block;">
                📋 Feedback Details
              </h3>

              <div style="margin-bottom: 18px; padding: 12px; background-color: #ffffff; border-radius: 8px; border-left: 4px solid #800020;">
                <span style="display: inline-block; width: 80px; color: #6b7280; font-weight: 600; font-size: 14px;">📧 Email:</span>
                <span style="color: #1f2937; font-weight: 600; font-size: 16px;">${email}</span>
              </div>

              <div style="margin-bottom: 18px; padding: 12px; background-color: #ffffff; border-radius: 8px; border-left: 4px solid #800020;">
                <span style="display: inline-block; width: 80px; color: #6b7280; font-weight: 600; font-size: 14px;">📞 Phone:</span>
                <span style="color: #1f2937; font-weight: 600; font-size: 16px;">${phone}</span>
              </div>

              <div style="margin-bottom: 18px; padding: 12px; background-color: #ffffff; border-radius: 8px; border-left: 4px solid #800020;">
                <span style="display: inline-block; width: 80px; color: #6b7280; font-weight: 600; font-size: 14px;">📅 Date:</span>
                <span style="color: #1f2937; font-weight: 600; font-size: 16px;">${new Date().toLocaleString(
                  "en-IN",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                    timeZone: "Asia/Kolkata",
                  }
                )}</span>
              </div>

              <div style="padding: 12px; background-color: #ffffff; border-radius: 8px; border-left: 4px solid #800020;">
                <span style="display: block; color: #6b7280; font-weight: 600; font-size: 14px; margin-bottom: 8px;">💬 Message:</span>
                <div style="color: #1f2937; font-size: 16px; line-height: 1.6; white-space: pre-wrap; background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">${message}</div>
              </div>
            </div>

            <!-- Action Required -->
            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 6px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <h4 style="color: #065f46; margin: 0 0 10px 0; font-size: 16px; font-weight: 700; display: flex; align-items: center;">
                <span style="margin-right: 8px;">✅</span>
                Action Required
              </h4>
              <p style="color: #065f46; margin: 0; font-size: 14px; line-height: 1.6;">
                Please review this feedback and respond to the user if necessary. Consider this feedback for improving our services.
              </p>
            </div>

            <!-- Contact Information -->
            <div style="background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #d1d5db;">
              <h4 style="color: #374151; margin: 0 0 10px 0; font-size: 16px; font-weight: 700;">
                📞 Contact User
              </h4>
              <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">
                Email: <a href="mailto:${email}" style="color: #800020; text-decoration: none; font-weight: 600;">${email}</a>
              </p>
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                Phone: <a href="tel:${phone}" style="color: #800020; text-decoration: none; font-weight: 600;">${phone}</a>
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
              This is an automated message from the District Administrative Centre Support System.
            </p>
            <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 11px;">
              © ${new Date().getFullYear()} District Administrative Centre, Gangtok. All rights reserved.
            </p>
          </div>

        </div>
      </body>
      </html>
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Feedback email sent successfully to admin`);
    return result;
  } catch (error) {
    console.error("Failed to send feedback email:", error);
    throw new Error("Failed to send feedback email");
  }
}
