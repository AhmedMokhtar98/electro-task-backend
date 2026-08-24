// helpers/emailService.helper.js

"use strict";

require("dotenv").config();

const nodemailer = require("nodemailer");

const {
  passwordResetEmailTemplate,
  emailConfirmationOTPTemplate,
} = require("../utils/emailTemplates");

// ======================================================
// Configuration
// ======================================================

const EMAIL_HOST = String(
  process.env.EMAIL_HOST ||
    "mail.privateemail.com"
).trim();

const EMAIL_PORT = Number(
  process.env.EMAIL_PORT || 465
);

const EMAIL_USER = String(
  process.env.EMAIL_USER || ""
).trim();

const EMAIL_PASS = String(
  process.env.EMAIL_PASS || ""
);

const EMAIL_FROM = String(
  process.env.EMAIL_FROM ||
    `Electro Task Team <${EMAIL_USER}>`
).trim();

// ======================================================
// Safe error formatter
// ======================================================

function safeError(error) {
  return {
    message: error?.message,
    code: error?.code,
    response: error?.response,
    responseCode: error?.responseCode,
    command: error?.command,
  };
}

// ======================================================
// SMTP transporter
// ======================================================

function createTransporter() {
  if (!EMAIL_USER) {
    console.warn(
      "⚠️ Missing EMAIL_USER in environment"
    );
  }

  if (!EMAIL_PASS) {
    console.warn(
      "⚠️ Missing EMAIL_PASS in environment"
    );
  }

  const secure = EMAIL_PORT === 465;

  const transportOptions = {
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure,

    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },

    pool: true,
    maxConnections: 5,
    maxMessages: 100,

    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
  };

  if (EMAIL_PORT === 587) {
    transportOptions.requireTLS = true;
  }

  return nodemailer.createTransport(
    transportOptions
  );
}

const transporter = createTransporter();

// ======================================================
// Optional SMTP verification
// ======================================================

if (
  String(
    process.env.EMAIL_VERIFY_ON_START ||
      "false"
  )
    .trim()
    .toLowerCase() === "true"
) {
  transporter
    .verify()
    .then(() => {
      console.log(
        `✅ SMTP ready: ${EMAIL_HOST}:${EMAIL_PORT}`
      );
    })
    .catch((error) => {
      console.error(
        "❌ SMTP verification failed:",
        safeError(error)
      );
    });
}

// ======================================================
// Internal helpers
// ======================================================

function normalizeFrom(from) {
  const normalizedFrom = String(
    from || ""
  ).trim();

  if (normalizedFrom) {
    return normalizedFrom;
  }

  if (EMAIL_FROM) {
    return EMAIL_FROM;
  }

  if (EMAIL_USER) {
    return `Electro Task Team <${EMAIL_USER}>`;
  }

  throw new Error(
    "EMAIL_FROM_NOT_CONFIGURED"
  );
}

function normalizeLanguage(lang) {
  return String(lang || "en")
    .trim()
    .toLowerCase()
    .startsWith("ar")
    ? "ar"
    : "en";
}

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ======================================================
// Generic email sender
// ======================================================

async function sendMail({
  to,
  subject,
  text,
  html,
  from,
}) {
  const normalizedTo = String(
    to || ""
  ).trim();

  const normalizedSubject = String(
    subject || ""
  ).trim();

  if (!normalizedTo) {
    throw new Error("Missing `to`");
  }

  if (!normalizedSubject) {
    throw new Error("Missing `subject`");
  }

  if (!EMAIL_USER) {
    throw new Error(
      "EMAIL_USER_NOT_CONFIGURED"
    );
  }

  if (!EMAIL_PASS) {
    throw new Error(
      "EMAIL_PASS_NOT_CONFIGURED"
    );
  }

  const mailOptions = {
    from: normalizeFrom(from),
    to: normalizedTo,
    subject: normalizedSubject,
  };

  if (text) {
    mailOptions.text = text;
  }

  if (html) {
    mailOptions.html = html;
  }

  const info =
    await transporter.sendMail(
      mailOptions
    );

  const accepted = Array.isArray(
    info?.accepted
  )
    ? info.accepted
    : [];

  const rejected = Array.isArray(
    info?.rejected
  )
    ? info.rejected
    : [];

  if (
    rejected.length > 0 &&
    accepted.length === 0
  ) {
    throw new Error(
      "EMAIL_RECIPIENT_REJECTED"
    );
  }

  return {
    success: true,
    messageId: info?.messageId,
    accepted,
    rejected,
    response: info?.response,
  };
}

// ======================================================
// Email-confirmation OTP
// ======================================================

async function sendOTPEmailConfirmationToClient({
  email,
  otp,
  lang = "en",
  expiresInMinutes = 10,
}) {
  try {
    if (!email) {
      throw new Error(
        "Missing `email`"
      );
    }

    if (!otp) {
      throw new Error(
        "Missing `otp`"
      );
    }

    const normalizedLang =
      normalizeLanguage(lang);

    const isArabic =
      normalizedLang === "ar";

    await sendMail({
      to: email,

      subject: isArabic
        ? "رمز تأكيد البريد الإلكتروني"
        : "Email confirmation code",

      text: isArabic
        ? `رمز تأكيد بريدك الإلكتروني هو: ${otp}. ينتهي خلال ${expiresInMinutes} دقائق.`
        : `Your email confirmation code is: ${otp}. It expires in ${expiresInMinutes} minutes.`,

      html:
        emailConfirmationOTPTemplate({
          otp,
          lang: normalizedLang,
          expiresInMinutes,
        }),

      from: EMAIL_FROM,
    });

    return {
      success: true,
      code: 201,
      message:
        "Email confirmation OTP sent successfully",
    };
  } catch (error) {
    console.error(
      "Error sending email confirmation OTP:",
      safeError(error)
    );

    return {
      success: false,
      code: 500,
      message:
        "Failed to send email confirmation OTP",
    };
  }
}

// ======================================================
// Password-reset link email
// ======================================================

async function sendPasswordResetEmailToClient({
  email,
  firstName = "",
  resetLink,
  lang = "en",
  expiresInMinutes = 15,
}) {
  try {
    if (!email) {
      throw new Error(
        "Missing `email`"
      );
    }

    if (!resetLink) {
      throw new Error(
        "Missing `resetLink`"
      );
    }

    if (
      typeof passwordResetEmailTemplate !==
      "function"
    ) {
      throw new Error(
        "passwordResetEmailTemplate is not exported correctly"
      );
    }

    const normalizedLang =
      normalizeLanguage(lang);

    const isArabic =
      normalizedLang === "ar";

    await sendMail({
      to: email,

      subject: isArabic
        ? "إعادة تعيين كلمة المرور"
        : "Reset your password",

      text: isArabic
        ? `استخدم الرابط التالي لإعادة تعيين كلمة المرور. سينتهي الرابط خلال ${expiresInMinutes} دقيقة: ${resetLink}`
        : `Use the following link to reset your password. The link expires in ${expiresInMinutes} minutes: ${resetLink}`,

      html: passwordResetEmailTemplate({
        firstName,
        resetLink,
        lang: normalizedLang,
        expiresInMinutes,
      }),

      from: EMAIL_FROM,
    });

    return {
      success: true,
      code: 201,
      message:
        "Password reset email sent successfully",
    };
  } catch (error) {
    console.error(
      "Error sending password reset email:",
      safeError(error)
    );

    return {
      success: false,
      code: 500,
      message:
        "Failed to send password reset email",
    };
  }
}

// ======================================================
// Exports
// ======================================================

module.exports = {
  sendOTPEmailConfirmationToClient,
  sendPasswordResetEmailToClient,
};