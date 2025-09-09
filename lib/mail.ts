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

// Helper function to log OTP in development
function logOTPInDevelopment(email: string, otp: string, type: string) {
  if (!isProduction) {
    console.log("=".repeat(50));
    console.log("📧 OTP GENERATED FOR:", email);
    console.log("🔐 OTP CODE:", otp);
    console.log("📋 TYPE:", type);
    console.log("⏰ EXPIRES IN: 10 minutes");
    console.log("=".repeat(50));
  }
}

export async function sendOTPEmail(to: string, otp: string) {
  const emailType = "GENERAL_OTP";

  // Always log to console for development and debugging
  logOTPInDevelopment(to, otp, emailType);

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

  // Always log to console for development and debugging
  logOTPInDevelopment(to, otp, emailType);

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

  // Always log to console for development and debugging
  logOTPInDevelopment(to, otp, emailType);

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

  // Always log to console for development and debugging
  logOTPInDevelopment(to, otp, emailType);

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
    loginUrl || `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;

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
    subject: `Welcome to DAC - Your Account Has Been Created`,
    text: `
Welcome to DAC!

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
DAC Team
    `,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to DAC</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
            <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 50%; margin-bottom: 15px;">
              <span style="font-size: 40px;">${roleInfo.icon}</span>
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
              Welcome to DAC
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
                Your account has been created and you can now access the DAC system. Below are your login credentials:
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
              This is an automated message from DAC System.<br>
              Please do not reply to this email.
            </p>
            <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
              © ${new Date().getFullYear()} DAC. All rights reserved.
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
