import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: process.env.EMAIL_SERVER_SECURE === "true",
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function sendOTPEmail(to: string, otp: string) {
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

  return await transporter.sendMail(mailOptions);
}

export async function sendVerificationEmail(to: string, otp: string) {
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

  return await transporter.sendMail(mailOptions);
}

export async function sendPasswordResetEmail(to: string, otp: string) {
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

  return await transporter.sendMail(mailOptions);
}
