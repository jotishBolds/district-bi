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

  if (!isProduction) {
    // Development: Log to console
    logOTPInDevelopment(to, otp, emailType);
    return Promise.resolve({ messageId: "dev-mode" });
  }

  // Production: Send actual email
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

  if (!isProduction) {
    // Development: Log to console
    logOTPInDevelopment(to, otp, emailType);
    return Promise.resolve({ messageId: "dev-mode" });
  }

  // Production: Send actual email
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

  if (!isProduction) {
    // Development: Log to console
    logOTPInDevelopment(to, otp, emailType);
    return Promise.resolve({ messageId: "dev-mode" });
  }

  // Production: Send actual email
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

  if (!isProduction) {
    // Development: Log to console
    logOTPInDevelopment(to, otp, emailType);
    return Promise.resolve({ messageId: "dev-mode" });
  }

  // Production: Send actual email
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
