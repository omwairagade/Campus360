import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import prisma from "../lib/prisma.js";

// ============================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

// ============================================================
// CAMPUS EMAIL DOMAINS
// ============================================================

const STUDENT_EMAIL_DOMAIN = (
  process.env.COLLEGE_EMAIL_DOMAIN || "campus360.in"
)
  .trim()
  .toLowerCase()
  .replace(/^@/, "");

const STAFF_EMAIL_DOMAIN = "campus360.com";

// ============================================================
// EMAIL VALIDATION HELPERS
// ============================================================

const isValidEmailFormat = (email) => {
  if (!email) {
    return false;
  }

  const normalizedEmail = String(email)
    .trim()
    .toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+$/;

  return emailRegex.test(normalizedEmail);
};

// ============================================================
// STUDENT EMAIL
// ============================================================

const isStudentEmail = (email) => {
  if (!isValidEmailFormat(email)) {
    return false;
  }

  const normalizedEmail = String(email)
    .trim()
    .toLowerCase();

  return normalizedEmail.endsWith(
    "@" + STUDENT_EMAIL_DOMAIN
  );
};

// ============================================================
// STAFF EMAIL
// ============================================================

const isStaffEmail = (email) => {
  if (!isValidEmailFormat(email)) {
    return false;
  }

  const normalizedEmail = String(email)
    .trim()
    .toLowerCase();

  return normalizedEmail.endsWith(
    "@" + STAFF_EMAIL_DOMAIN
  );
};

// ============================================================
// ROLE-BASED EMAIL VALIDATION
// ============================================================

const isValidRoleEmail = (email, role) => {
  const normalizedRole = String(role || "")
    .trim()
    .toUpperCase();

  if (
    normalizedRole === "ADMIN" ||
    normalizedRole === "FACULTY" ||
    normalizedRole === "TEACHER"
  ) {
    return isStaffEmail(email);
  }

  if (normalizedRole === "STUDENT") {
    return isStudentEmail(email);
  }

  return false;
};

// ============================================================
// ROLE-BASED EMAIL ERROR MESSAGE
// ============================================================

const getRoleEmailErrorMessage = (role) => {
  const normalizedRole = String(role || "")
    .trim()
    .toUpperCase();

  if (normalizedRole === "ADMIN") {
    return (
      "Admin must use a Campus360 staff email ending with @" +
      STAFF_EMAIL_DOMAIN +
      "."
    );
  }

  if (
    normalizedRole === "FACULTY" ||
    normalizedRole === "TEACHER"
  ) {
    return (
      "Faculty must use a Campus360 staff email ending with @" +
      STAFF_EMAIL_DOMAIN +
      "."
    );
  }

  if (normalizedRole === "STUDENT") {
    return (
      "Student must use a Campus360 college email ending with @" +
      STUDENT_EMAIL_DOMAIN +
      "."
    );
  }

  return "Invalid Campus360 email address.";
};

// ============================================================
// MAIL TRANSPORTER
// ============================================================

const mailTransporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.MAIL_PORT) || 587,
  secure: Number(process.env.MAIL_PORT) === 465,

  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

// ============================================================
// VERIFY SMTP CONNECTION
// ============================================================

mailTransporter.verify((error) => {
  if (error) {
    console.error("==========================================");
    console.error("SMTP CONNECTION FAILED");
    console.error("==========================================");

    console.error(error.message);

    console.error(
      "MAIL_HOST:",
      process.env.MAIL_HOST || "NOT CONFIGURED"
    );

    console.error(
      "MAIL_PORT:",
      process.env.MAIL_PORT || "NOT CONFIGURED"
    );

    console.error(
      "MAIL_USER:",
      process.env.MAIL_USER
        ? process.env.MAIL_USER
        : "NOT CONFIGURED"
    );

    console.error(
      "MAIL_PASSWORD:",
      process.env.MAIL_PASSWORD
        ? "CONFIGURED"
        : "NOT CONFIGURED"
    );

    console.error("==========================================");
  } else {
    console.log("==========================================");
    console.log("SMTP CONNECTION SUCCESSFUL");
    console.log("==========================================");

    console.log(
      "Mail account:",
      process.env.MAIL_USER
    );

    console.log("==========================================");
  }
});

// ============================================================
// PASSWORD RESET STORAGE
// ============================================================

const passwordResetStore = new Map();

// ============================================================
// VERIFY GOOGLE RECAPTCHA
// ============================================================

const verifyRecaptcha = async (captchaToken) => {
  try {
    if (!captchaToken) {
      return false;
    }

    if (!process.env.RECAPTCHA_SECRET_KEY) {
      console.error(
        "RECAPTCHA_SECRET_KEY is not configured."
      );

      return false;
    }

    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body: new URLSearchParams({
          secret:
            process.env.RECAPTCHA_SECRET_KEY,

          response: captchaToken,
        }),
      }
    );

    const result = await response.json();

    console.log(
      "reCAPTCHA verification:",
      result.success
    );

    return result.success === true;
  } catch (error) {
    console.error(
      "reCAPTCHA verification error:",
      error
    );

    return false;
  }
};

// ============================================================
// REGISTER USER
// ============================================================

export const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !role
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const normalizedRole = String(role)
      .trim()
      .toUpperCase();

    if (
      !isValidRoleEmail(
        normalizedEmail,
        normalizedRole
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          getRoleEmailErrorMessage(
            normalizedRole
          ),
      });
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const passwordHash =
      await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: normalizedEmail,
        passwordHash,
        role: normalizedRole,
        mustChangePassword: false,
      },
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",

      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        mustChangePassword:
          user.mustChangePassword,
      },
    });
  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while registering the user",
    });
  }
};

// ============================================================
// LOGIN USER
// ============================================================

export const loginUser = async (req, res) => {
  try {
    const {
      identifier,
      password,
      captchaToken,
    } = req.body;

    // --------------------------------------------------------
    // CAPTCHA VALIDATION
    // --------------------------------------------------------

    if (!captchaToken) {
      return res.status(400).json({
        success: false,
        message:
          "Please complete the human verification.",
      });
    }

    const captchaValid =
      await verifyRecaptcha(captchaToken);

    if (!captchaValid) {
      return res.status(400).json({
        success: false,
        message:
          "Human verification failed. Please try again.",
      });
    }

    // --------------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------------

    const loginIdentifier = String(
      identifier || ""
    ).trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email or phone number and password are required",
      });
    }

    // --------------------------------------------------------
    // DETERMINE LOGIN METHOD
    // --------------------------------------------------------

    const isEmailLogin =
      loginIdentifier.includes("@");

    let user = null;

    // ========================================================
    // EMAIL LOGIN
    // ========================================================

    if (isEmailLogin) {
      const normalizedEmail =
        loginIdentifier.toLowerCase();

      if (!isValidEmailFormat(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid email address.",
        });
      }

      user =
        await prisma.user.findUnique({
          where: {
            email: normalizedEmail,
          },
        });

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email or password",
        });
      }

      if (
        !isValidRoleEmail(
          normalizedEmail,
          user.role
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            getRoleEmailErrorMessage(
              user.role
            ),
        });
      }
    }

    // ========================================================
    // PHONE LOGIN
    // ========================================================

    else {
      const normalizedPhone =
        loginIdentifier.replace(
          /\s+/g,
          ""
        );

      if (!/^\d{10}$/.test(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 10-digit registered phone number.",
        });
      }

      const student =
        await prisma.student.findFirst({
          where: {
            phone: normalizedPhone,
          },

          include: {
            user: true,
          },
        });

      if (!student || !student.user) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid phone number or password",
        });
      }

      user = student.user;

      if (
        String(user.role || "")
          .toUpperCase() !== "STUDENT"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Phone number login is available only for students.",
        });
      }

      if (
        !isValidRoleEmail(
          user.email,
          user.role
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            getRoleEmailErrorMessage(
              user.role
            ),
        });
      }
    }

    // ========================================================
    // ACCOUNT STATUS
    // ========================================================

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive",
      });
    }

    // ========================================================
    // PASSWORD VALIDATION
    // ========================================================

    const isPasswordValid =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email/phone or password",
      });
    }

    // ========================================================
    // CREATE JWT
    // ========================================================

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    // ========================================================
    // LOGIN SUCCESS
    // ========================================================

    return res.status(200).json({
      success: true,
      message: "Login successful",

      token,

      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        mustChangePassword:
          user.mustChangePassword,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while logging in",
    });
  }
};

// ============================================================
// FORGOT PASSWORD
// ============================================================

export const forgotPassword = async (req, res) => {
  try {
    const email = String(
      req.body?.email || ""
    )
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email address is required.",
      });
    }

    if (!isValidEmailFormat(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid email address.",
      });
    }

    console.log(
      "Password reset requested for:",
      email
    );

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (!user) {
      console.log(
        "Password reset email not registered:",
        email
      );

      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a verification code has been sent.",
      });
    }

    if (
      !isValidRoleEmail(
        email,
        user.role
      )
    ) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a verification code has been sent.",
      });
    }

    if (!user.isActive) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a verification code has been sent.",
      });
    }

    const otp = String(
      crypto.randomInt(100000, 1000000)
    );

    const expiresAt =
      Date.now() + 10 * 60 * 1000;

    passwordResetStore.set(email, {
      otp,
      expiresAt,
      userId: user.id,
      attempts: 0,
    });

    console.log(
      "OTP generated for:",
      email
    );

    console.log(
      "OTP expires at:",
      new Date(expiresAt).toLocaleString()
    );

    try {
      const emailHtml = [
        '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f5f7fb;">',

        '<div style="background: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #e5e7eb;">',

        '<h2 style="color: #1769ff; margin: 0 0 10px;">',
        "Campus360",
        "</h2>",

        '<p style="color: #475467; font-size: 15px; line-height: 1.6;">',
        "You requested to reset your Campus360 account password.",
        "</p>",

        '<p style="color: #475467; font-size: 15px;">',
        "Your verification code is:",
        "</p>",

        '<div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1769ff; background: #edf4ff; padding: 18px; text-align: center; border-radius: 12px; margin: 20px 0;">',
        otp,
        "</div>",

        '<p style="color: #667085; font-size: 13px; line-height: 1.6;">',
        "This verification code is valid for 10 minutes.",
        "</p>",

        '<p style="color: #667085; font-size: 13px; line-height: 1.6;">',
        "If you did not request a password reset, you can safely ignore this email.",
        "</p>",

        '<hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;">',

        '<p style="color: #98a2b3; font-size: 12px;">',
        "Campus360 • College Management Portal",
        "</p>",

        "</div>",
        "</div>",
      ].join("");

      const mailInfo =
        await mailTransporter.sendMail({
          from:
            '"Campus360" <' +
            process.env.MAIL_USER +
            ">",

          to: email,

          subject:
            "Campus360 Password Reset OTP",

          html: emailHtml,
        });

      console.log(
        "=========================================="
      );

      console.log(
        "OTP EMAIL SENT SUCCESSFULLY"
      );

      console.log(
        "Message ID:",
        mailInfo.messageId
      );

      console.log(
        "Accepted:",
        mailInfo.accepted
      );

      console.log(
        "Rejected:",
        mailInfo.rejected
      );

      console.log(
        "=========================================="
      );
    } catch (mailError) {
      console.error(
        "=========================================="
      );

      console.error(
        "OTP EMAIL SEND FAILED"
      );

      console.error(
        "=========================================="
      );

      console.error(
        "Error code:",
        mailError.code
      );

      console.error(
        "Error command:",
        mailError.command
      );

      console.error(
        "Error response:",
        mailError.response
      );

      console.error(
        "Error message:",
        mailError.message
      );

      console.error(
        "=========================================="
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to send verification email. Please check the email server configuration.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a verification code has been sent.",
    });
  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to process password reset request.",
    });
  }
};

// ============================================================
// VERIFY PASSWORD RESET OTP
// ============================================================

export const verifyResetOtp = async (req, res) => {
  try {
    const email = String(
      req.body?.email || ""
    )
      .trim()
      .toLowerCase();

    const otp = String(
      req.body?.otp || ""
    ).trim();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Email and OTP are required.",
      });
    }

    if (!isValidEmailFormat(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid email address.",
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "OTP is invalid or has expired.",
      });
    }

    if (
      !isValidRoleEmail(
        email,
        user.role
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid Campus360 password reset request.",
      });
    }

    const resetData =
      passwordResetStore.get(email);

    if (!resetData) {
      return res.status(400).json({
        success: false,
        message:
          "OTP is invalid or has expired.",
      });
    }

    if (
      Date.now() > resetData.expiresAt
    ) {
      passwordResetStore.delete(email);

      return res.status(400).json({
        success: false,
        message:
          "OTP has expired. Please request a new OTP.",
      });
    }

    if (resetData.otp !== otp) {
      resetData.attempts += 1;

      if (resetData.attempts >= 5) {
        passwordResetStore.delete(email);

        return res.status(429).json({
          success: false,
          message:
            "Too many incorrect attempts. Please request a new OTP.",
        });
      }

      return res.status(400).json({
        success: false,
        message:
          "Incorrect verification code.",
      });
    }

    const resetToken = jwt.sign(
      {
        userId: resetData.userId,
        email,
        purpose: "PASSWORD_RESET",
      },

      process.env.PASSWORD_RESET_SECRET ||
        process.env.JWT_SECRET,

      {
        expiresIn: "10m",
      }
    );

    passwordResetStore.delete(email);

    return res.status(200).json({
      success: true,
      message:
        "OTP verified successfully.",

      resetToken,
    });
  } catch (error) {
    console.error(
      "Verify reset OTP error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify OTP.",
    });
  }
};

// ============================================================
// RESET PASSWORD
// ============================================================

export const resetPassword = async (req, res) => {
  try {
    const {
      resetToken,
      newPassword,
      confirmPassword,
    } = req.body;

    if (
      !resetToken ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All password fields are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters.",
      });
    }

    if (
      newPassword !== confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Passwords do not match.",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        resetToken,

        process.env.PASSWORD_RESET_SECRET ||
          process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          "Password reset session is invalid or expired.",
      });
    }

    if (
      decoded?.purpose !==
      "PASSWORD_RESET"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid password reset request.",
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: decoded.userId,
        },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User account not found.",
      });
    }

    if (
      !isValidRoleEmail(
        user.email,
        user.role
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid Campus360 password reset request.",
      });
    }

    const passwordHash =
      await bcrypt.hash(
        newPassword,
        10
      );

    await prisma.user.update({
      where: {
        id: decoded.userId,
      },

      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reset password.",
    });
  }
};

// ============================================================
// CHANGE PASSWORD
// ============================================================

export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All password fields are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 8 characters long.",
      });
    }

    if (
      newPassword !== confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New password and confirm password do not match.",
      });
    }

    if (
      currentPassword === newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from the current password.",
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User account not found.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive.",
      });
    }

    const currentPasswordValid =
      await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

    if (!currentPasswordValid) {
      return res.status(400).json({
        success: false,
        message:
          "Current password is incorrect.",
      });
    }

    const passwordHash =
      await bcrypt.hash(
        newPassword,
        10
      );

    const updatedUser =
      await prisma.user.update({
        where: {
          id: userId,
        },

        data: {
          passwordHash,
          mustChangePassword: false,
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully.",

      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
        mustChangePassword:
          updatedUser.mustChangePassword,
      },
    });
  } catch (error) {
    console.error(
      "Change password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to change password.",
    });
  }
};